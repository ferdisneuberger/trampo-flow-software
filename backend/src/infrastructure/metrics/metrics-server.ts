import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { PromAppMetrics } from './prom-app-metrics';

/**
 * Servidor **interno** das métricas, em porta própria. Fica fora do Fastify
 * principal de propósito: o nginx repassa `/api/*` para a porta da API, então um
 * `/metrics` lá seria publicado como `/api/metrics`. Esta porta não é
 * publicada no host nem roteada pelo ingress.
 */
@Injectable()
export class MetricsServer
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MetricsServer.name);
  private server: Server | undefined;

  constructor(
    private readonly metrics: PromAppMetrics,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<string>('METRICS_ENABLED')?.trim() === 'false') {
      return;
    }

    const port = Number(this.config.get<string>('METRICS_PORT') ?? 9464);
    const token = this.config.get<string>('METRICS_BEARER_TOKEN')?.trim();

    this.server = createServer((request, response) => {
      void this.handle(
        request.url ?? '/',
        request.method,
        request.headers.authorization,
        token,
      ).then(({ status, body, type }) => {
        response.writeHead(status, { 'Content-Type': type });
        response.end(body);
      });
    });

    await new Promise<void>((resolve) => {
      this.server?.once('error', (error) => {
        // Porta ocupada não pode impedir a API de subir.
        this.logger.error(`Servidor de métricas não iniciou: ${error.message}`);
        this.server = undefined;
        resolve();
      });
      this.server?.listen(port, '0.0.0.0', () => {
        this.logger.log(`Métricas em :${port}/metrics`);
        resolve();
      });
    });
  }

  /** Visível para teste: decide a resposta sem abrir socket. */
  async handle(
    url: string,
    method: string | undefined,
    authorization: string | undefined,
    token: string | undefined,
  ): Promise<{ status: number; body: string; type: string }> {
    const path = url.split('?')[0];

    if (path !== '/metrics' || method !== 'GET') {
      return { status: 404, body: 'Not found', type: 'text/plain' };
    }

    if (token && !this.tokenMatches(authorization, token)) {
      return { status: 401, body: 'Unauthorized', type: 'text/plain' };
    }

    return {
      status: 200,
      body: await this.metrics.registry.metrics(),
      type: this.metrics.registry.contentType,
    };
  }

  private tokenMatches(
    authorization: string | undefined,
    token: string,
  ): boolean {
    const given = Buffer.from(authorization?.replace(/^Bearer\s+/i, '') ?? '');
    const expected = Buffer.from(token);

    return given.length === expected.length && timingSafeEqual(given, expected);
  }

  async onApplicationShutdown(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => resolve());
    });
  }
}
