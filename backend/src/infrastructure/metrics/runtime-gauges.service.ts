import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { PromAppMetrics } from './prom-app-metrics';

const DB_PROBE_INTERVAL_MS = 15_000;
const DB_PROBE_TIMEOUT_MS = 3_000;

/** Tabelas conhecidas: o nome real só vira rótulo se estiver nesta lista. */
const TABLES = new Set([
  'applications',
  'users',
  'auth_tokens',
  'refresh_tokens',
  'personal_access_tokens',
  'oauth_clients',
  'oauth_grants',
  'oauth_codes',
  'oauth_access_tokens',
  'oauth_refresh_tokens',
]);

/** Operação e tabela de uma consulta do Prisma, a partir do SQL (sem o SQL em si). */
export function describeQuery(sql: string): {
  operation: string;
  table: string;
} {
  const verb = /^\s*(SELECT|INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK)/i.exec(
    sql,
  )?.[1];
  const table = /(?:FROM|INTO|UPDATE)\s+"public"\."([a-z_]+)"/i.exec(sql)?.[1];

  return {
    operation: verb ? verb.toLowerCase() : 'other',
    table: table && TABLES.has(table) ? table : 'other',
  };
}

/**
 * Mede o banco: `trampo_db_up` (sonda a cada 15 s, com tempo máximo) e a duração
 * das consultas, pelos eventos do próprio Prisma.
 */
@Injectable()
export class RuntimeGaugesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RuntimeGaugesService.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly metrics: PromAppMetrics,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.prisma.onQuery((sql, durationMs) => {
      const { operation, table } = describeQuery(sql);

      this.metrics.dbQueryDuration.observe(
        { operation, table },
        durationMs / 1000,
      );
    });
    this.prisma.onError(() => this.metrics.dbQueryErrors.inc());

    void this.probe();
    this.timer = setInterval(() => void this.probe(), DB_PROBE_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  async probe(): Promise<void> {
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('timeout')),
            DB_PROBE_TIMEOUT_MS,
          ).unref(),
        ),
      ]);
      this.metrics.dbUp.set(1);
    } catch (error) {
      this.metrics.dbUp.set(0);
      this.logger.warn(
        `Sonda do banco falhou: ${error instanceof Error ? error.message : 'erro'}`,
      );
    }
  }
}
