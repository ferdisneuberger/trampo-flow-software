import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma/prisma.service';
import { PromAppMetrics } from './prom-app-metrics';

const DEFAULT_INTERVAL_SECONDS = 60;

type UserRow = { verified: boolean; google: boolean; count: number };
type StatusRow = { status: string; count: number };
type ActivityRow = {
  d1: number;
  d7: number;
  d30: number;
  stale7: number;
  stale14: number;
  stale30: number;
};
type FunnelRow = {
  signed_up: number;
  verified: number;
  has_application: number;
  has_in_progress: number;
  has_completed: number;
  n5: number;
  n10: number;
  n25: number;
};
type ScopeRow = { scope: string; count: number };
type SourceRow = { source: string; count: number };

/**
 * Estoques de negócio (usuários, candidaturas, funil, tokens, OAuth). São
 * calculados no banco **a cada 60 s** por um temporizador, nunca a cada scrape:
 * o Prometheus raspa o último valor e o banco leva poucas consultas agregadas por
 * minuto. Se uma atualização falhar, o último valor é mantido e a falha é contada.
 */
@Injectable()
export class BusinessGaugesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BusinessGaugesService.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly metrics: PromAppMetrics,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (this.config.get<string>('METRICS_ENABLED')?.trim() === 'false') {
      return;
    }

    const seconds = Number(
      this.config.get<string>('BUSINESS_GAUGES_INTERVAL_SECONDS') ??
        DEFAULT_INTERVAL_SECONDS,
    );
    const intervalMs =
      (Number.isFinite(seconds) && seconds >= 5
        ? seconds
        : DEFAULT_INTERVAL_SECONDS) * 1000;

    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), intervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  /** Atualiza todos os estoques; nunca lança. */
  async refresh(): Promise<void> {
    try {
      const [users, statuses, activity, funnel, tokens, grants, clients] =
        await Promise.all([
          this.prisma.$queryRaw<UserRow[]>`
            SELECT (email_verified_at IS NOT NULL) AS verified,
                   (google_id IS NOT NULL) AS google,
                   count(*)::int AS count
            FROM users GROUP BY 1, 2`,
          this.prisma.$queryRaw<StatusRow[]>`
            SELECT status::text AS status, count(*)::int AS count
            FROM applications WHERE deleted_at IS NULL GROUP BY status`,
          this.prisma.$queryRaw<ActivityRow[]>`
            SELECT
              count(DISTINCT user_id) FILTER (WHERE updated_at >= now() - interval '1 day')::int AS d1,
              count(DISTINCT user_id) FILTER (WHERE updated_at >= now() - interval '7 days')::int AS d7,
              count(DISTINCT user_id) FILTER (WHERE updated_at >= now() - interval '30 days')::int AS d30,
              count(*) FILTER (WHERE status IN ('PENDING', 'IN_PROGRESS') AND updated_at < now() - interval '7 days')::int AS stale7,
              count(*) FILTER (WHERE status IN ('PENDING', 'IN_PROGRESS') AND updated_at < now() - interval '14 days')::int AS stale14,
              count(*) FILTER (WHERE status IN ('PENDING', 'IN_PROGRESS') AND updated_at < now() - interval '30 days')::int AS stale30
            FROM applications WHERE deleted_at IS NULL`,
          this.prisma.$queryRaw<FunnelRow[]>`
            WITH per_user AS (
              SELECT user_id,
                     count(*) AS total,
                     bool_or(status = 'IN_PROGRESS') AS in_progress,
                     bool_or(status = 'COMPLETED') AS completed
              FROM applications WHERE deleted_at IS NULL GROUP BY user_id
            )
            SELECT
              (SELECT count(*) FROM users)::int AS signed_up,
              (SELECT count(*) FROM users WHERE email_verified_at IS NOT NULL)::int AS verified,
              count(*)::int AS has_application,
              (count(*) FILTER (WHERE in_progress))::int AS has_in_progress,
              (count(*) FILTER (WHERE completed))::int AS has_completed,
              (count(*) FILTER (WHERE total >= 5))::int AS n5,
              (count(*) FILTER (WHERE total >= 10))::int AS n10,
              (count(*) FILTER (WHERE total >= 25))::int AS n25
            FROM per_user`,
          this.prisma.$queryRaw<ScopeRow[]>`
            SELECT scope, count(*)::int AS count
            FROM personal_access_tokens
            WHERE revoked_at IS NULL AND expires_at > now() GROUP BY scope`,
          this.prisma.oAuthGrant.count({ where: { revokedAt: null } }),
          this.prisma.$queryRaw<SourceRow[]>`
            SELECT source, count(*)::int AS count FROM oauth_clients GROUP BY source`,
        ]);

      this.apply({
        users,
        statuses,
        activity,
        funnel,
        tokens,
        grants,
        clients,
      });
      this.metrics.gaugesLastRefresh.set(Date.now() / 1000);
    } catch (error) {
      this.metrics.gaugesRefreshFailures.inc();
      this.logger.warn(
        `Falha ao atualizar os estoques de negócio: ${error instanceof Error ? error.message : 'erro'}`,
      );
    }
  }

  private apply(data: {
    users: UserRow[];
    statuses: StatusRow[];
    activity: ActivityRow[];
    funnel: FunnelRow[];
    tokens: ScopeRow[];
    grants: number;
    clients: SourceRow[];
  }): void {
    const m = this.metrics;

    // Toda combinação aparece (com 0), para os painéis não terem buracos.
    m.users.reset();
    for (const state of ['verified', 'unverified']) {
      for (const provider of ['password', 'google']) {
        m.users.set({ state, provider }, 0);
      }
    }
    for (const row of data.users) {
      m.users.set(
        {
          state: row.verified ? 'verified' : 'unverified',
          provider: row.google ? 'google' : 'password',
        },
        row.count,
      );
    }

    m.applications.reset();
    for (const status of ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']) {
      m.applications.set({ status }, 0);
    }
    for (const row of data.statuses) {
      m.applications.set({ status: row.status }, row.count);
    }

    const activity = data.activity[0];

    m.usersActive.set({ window: '1d' }, activity?.d1 ?? 0);
    m.usersActive.set({ window: '7d' }, activity?.d7 ?? 0);
    m.usersActive.set({ window: '30d' }, activity?.d30 ?? 0);
    m.applicationsStale.set({ days: '7' }, activity?.stale7 ?? 0);
    m.applicationsStale.set({ days: '14' }, activity?.stale14 ?? 0);
    m.applicationsStale.set({ days: '30' }, activity?.stale30 ?? 0);

    const funnel = data.funnel[0];

    m.usersFunnel.set({ stage: 'signed_up' }, funnel?.signed_up ?? 0);
    m.usersFunnel.set({ stage: 'email_verified' }, funnel?.verified ?? 0);
    m.usersFunnel.set(
      { stage: 'has_application' },
      funnel?.has_application ?? 0,
    );
    m.usersFunnel.set(
      { stage: 'has_in_progress' },
      funnel?.has_in_progress ?? 0,
    );
    m.usersFunnel.set({ stage: 'has_completed' }, funnel?.has_completed ?? 0);
    m.usersWithApplications.set(
      { at_least: '1' },
      funnel?.has_application ?? 0,
    );
    m.usersWithApplications.set({ at_least: '5' }, funnel?.n5 ?? 0);
    m.usersWithApplications.set({ at_least: '10' }, funnel?.n10 ?? 0);
    m.usersWithApplications.set({ at_least: '25' }, funnel?.n25 ?? 0);

    m.patActive.reset();
    m.patActive.set({ scope: 'read' }, 0);
    m.patActive.set({ scope: 'read_write' }, 0);
    for (const row of data.tokens) {
      const scope = row.scope.includes('applications:write')
        ? 'read_write'
        : 'read';

      m.patActive.inc({ scope }, row.count);
    }

    m.oauthGrantsActive.set(data.grants);
    m.oauthClients.reset();
    m.oauthClients.set({ source: 'dcr' }, 0);
    m.oauthClients.set({ source: 'cimd' }, 0);
    for (const row of data.clients) {
      m.oauthClients.set(
        { source: row.source === 'cimd' ? 'cimd' : 'dcr' },
        row.count,
      );
    }
  }
}
