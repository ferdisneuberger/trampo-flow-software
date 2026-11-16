import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

type QueryEvent = { query: string; duration: number };
type ErrorEvent = { message: string };

type EventSource = {
  $on(event: 'query', callback: (event: QueryEvent) => void): void;
  $on(event: 'error', callback: (event: ErrorEvent) => void): void;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Eventos de consulta e de erro alimentam as métricas (duração por tabela e
    // contagem de erros); avisos continuam indo para o log, como antes.
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  /** Observa a duração (ms) de cada consulta. O SQL nunca sai daqui como rótulo. */
  onQuery(callback: (sql: string, durationMs: number) => void): void {
    (this as unknown as EventSource).$on('query', (event) =>
      callback(event.query, event.duration),
    );
  }

  onError(callback: () => void): void {
    (this as unknown as EventSource).$on('error', (event) => {
      this.logger.error(event.message);
      callback();
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
