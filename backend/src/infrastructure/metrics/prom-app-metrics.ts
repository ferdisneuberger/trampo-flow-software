import { Injectable, Logger } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';
import {
  AppMetrics,
  type ApplicationMetricStatus,
  type CimdFetchResult,
  type EmailVerificationResult,
  type GoogleSignInResult,
  type GuardDenialReason,
  type JobPreviewMetricStatus,
  type LoginMethod,
  type LoginResult,
  type MailResult,
  type MailTemplate,
  type MetricAuthKind,
  type MetricChannel,
  type OAuthAccessTokenResult,
  type OAuthClientKind,
  type OAuthClientSourceKind,
  type OAuthDecision,
  type OAuthGrantTypeMetric,
  type OAuthRegistrationResult,
  type OAuthTokenResult,
  type PasswordResetStep,
  type PersonalTokenEvent,
  type PersonalTokenScope,
  type RegistrationResult,
  type SessionRefreshResult,
} from '../../application/shared/metrics/app-metrics';
import { APP_VERSION } from '../../app-version';
import { rateLimitRule } from './rate-limit-rule';
import { sourceBucket } from './source-bucket';

const SECONDS_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];
const STATUSES: string[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];
const CHANNELS: string[] = ['web', 'agent_token', 'agent_oauth'];
const AUTH_KINDS: string[] = ['jwt', 'pat', 'oauth', 'anonymous'];

/** Só deixa passar valores da lista fechada; o resto vira `other`. */
function pick(value: string, allowed: readonly string[]): string {
  return allowed.includes(value) ? value : 'other';
}

/**
 * Implementação do `AppMetrics` com `prom-client`. Usa um `Registry` próprio
 * (não o global) para isolar testes, e **nunca lança**: instrumentação não pode
 * derrubar uma requisição.
 */
@Injectable()
export class PromAppMetrics extends AppMetrics {
  private readonly logger = new Logger(PromAppMetrics.name);
  readonly registry = new Registry();

  // --- HTTP e processo
  readonly httpRequests = new Counter({
    name: 'trampo_http_requests_total',
    help: 'Requisições HTTP por método, rota (template), status e tipo de autenticação.',
    labelNames: ['method', 'route', 'status', 'auth'],
    registers: [this.registry],
  });
  readonly httpDuration = new Histogram({
    name: 'trampo_http_request_duration_seconds',
    help: 'Duração das requisições HTTP.',
    labelNames: ['method', 'route', 'status_class'],
    buckets: SECONDS_BUCKETS,
    registers: [this.registry],
  });
  readonly httpInFlight = new Gauge({
    name: 'trampo_http_requests_in_flight',
    help: 'Requisições HTTP em andamento.',
    registers: [this.registry],
  });
  readonly httpRequestSize = new Histogram({
    name: 'trampo_http_request_size_bytes',
    help: 'Tamanho do corpo das requisições (Content-Length).',
    labelNames: ['route'],
    buckets: [100, 500, 1_000, 5_000, 20_000, 100_000, 500_000, 1_000_000],
    registers: [this.registry],
  });
  readonly buildInfo = new Gauge({
    name: 'trampo_build_info',
    help: 'Versão em execução (valor sempre 1).',
    labelNames: ['version', 'node'],
    registers: [this.registry],
  });

  // --- banco
  readonly dbUp = new Gauge({
    name: 'trampo_db_up',
    help: '1 se o banco responde, 0 se não.',
    registers: [this.registry],
  });
  readonly dbQueryDuration = new Histogram({
    name: 'trampo_db_query_duration_seconds',
    help: 'Duração das consultas do Prisma por operação e tabela.',
    labelNames: ['operation', 'table'],
    buckets: SECONDS_BUCKETS,
    registers: [this.registry],
  });
  readonly dbQueryErrors = new Counter({
    name: 'trampo_db_query_errors_total',
    help: 'Erros reportados pelo Prisma.',
    registers: [this.registry],
  });

  // --- autenticação
  private readonly loginAttempts = new Counter({
    name: 'trampo_auth_login_attempts_total',
    help: 'Tentativas de login por método e resultado.',
    labelNames: ['method', 'result'],
    registers: [this.registry],
  });
  private readonly loginLockouts = new Counter({
    name: 'trampo_auth_login_lockouts_total',
    help: 'Vezes em que o limitador de login travou.',
    registers: [this.registry],
  });
  private readonly registrations = new Counter({
    name: 'trampo_auth_registrations_total',
    help: 'Cadastros por origem e resultado.',
    labelNames: ['source', 'result'],
    registers: [this.registry],
  });
  private readonly googleSignins = new Counter({
    name: 'trampo_auth_google_signins_total',
    help: 'Logins com Google por resultado.',
    labelNames: ['result'],
    registers: [this.registry],
  });
  private readonly emailVerifications = new Counter({
    name: 'trampo_auth_email_verifications_total',
    help: 'Verificações de e-mail por resultado.',
    labelNames: ['result'],
    registers: [this.registry],
  });
  private readonly passwordResets = new Counter({
    name: 'trampo_auth_password_resets_total',
    help: 'Recuperações de senha por etapa.',
    labelNames: ['step'],
    registers: [this.registry],
  });
  private readonly sessionRefreshes = new Counter({
    name: 'trampo_auth_session_refreshes_total',
    help: 'Renovações de sessão por resultado (reused indica roubo).',
    labelNames: ['result'],
    registers: [this.registry],
  });
  private readonly logouts = new Counter({
    name: 'trampo_auth_logouts_total',
    help: 'Encerramentos de sessão.',
    registers: [this.registry],
  });
  private readonly guardDenials = new Counter({
    name: 'trampo_auth_guard_denials_total',
    help: 'Requisições negadas pelo guard, por motivo e tipo de autenticação.',
    labelNames: ['reason', 'auth'],
    registers: [this.registry],
  });
  private readonly personalTokens = new Counter({
    name: 'trampo_pat_events_total',
    help: 'Eventos dos tokens de integração por escopo.',
    labelNames: ['event', 'scope'],
    registers: [this.registry],
  });
  private readonly rateLimitHits = new Counter({
    name: 'trampo_rate_limit_hits_total',
    help: 'Requisições barradas pelo limitador, por regra.',
    labelNames: ['rule'],
    registers: [this.registry],
  });

  // --- candidaturas
  private readonly appsCreated = new Counter({
    name: 'trampo_applications_created_total',
    help: 'Candidaturas criadas por canal e fonte da vaga.',
    labelNames: ['channel', 'source'],
    registers: [this.registry],
  });
  private readonly appsTransitions = new Counter({
    name: 'trampo_applications_transitions_total',
    help: 'Mudanças de status das candidaturas.',
    labelNames: ['from', 'to', 'channel'],
    registers: [this.registry],
  });
  private readonly appsPhaseUpdates = new Counter({
    name: 'trampo_applications_phase_updates_total',
    help: 'Atualizações da fase atual (a fase em si nunca é rótulo).',
    labelNames: ['channel'],
    registers: [this.registry],
  });
  private readonly appsDeleted = new Counter({
    name: 'trampo_applications_deleted_total',
    help: 'Candidaturas excluídas por modo.',
    labelNames: ['mode'],
    registers: [this.registry],
  });
  private readonly appsReordered = new Counter({
    name: 'trampo_applications_reordered_total',
    help: 'Reordenações no quadro.',
    labelNames: ['channel'],
    registers: [this.registry],
  });
  private readonly previews = new Counter({
    name: 'trampo_job_preview_total',
    help: 'Pré-visualizações de vaga por resultado e fonte.',
    labelNames: ['status', 'source'],
    registers: [this.registry],
  });
  private readonly previewDuration = new Histogram({
    name: 'trampo_job_preview_duration_seconds',
    help: 'Duração da extração de uma vaga.',
    labelNames: ['status'],
    buckets: SECONDS_BUCKETS,
    registers: [this.registry],
  });

  // --- e-mail
  private readonly mails = new Counter({
    name: 'trampo_mail_sent_total',
    help: 'E-mails por modelo e resultado.',
    labelNames: ['template', 'result'],
    registers: [this.registry],
  });
  private readonly mailDuration = new Histogram({
    name: 'trampo_mail_duration_seconds',
    help: 'Duração do envio de e-mail.',
    labelNames: ['template'],
    buckets: SECONDS_BUCKETS,
    registers: [this.registry],
  });

  // --- OAuth
  private readonly oauthRegistrations = new Counter({
    name: 'trampo_oauth_client_registrations_total',
    help: 'Registros de cliente OAuth por resultado.',
    labelNames: ['result'],
    registers: [this.registry],
  });
  private readonly oauthAuthorizations = new Counter({
    name: 'trampo_oauth_authorizations_total',
    help: 'Decisões na tela de permissão.',
    labelNames: ['decision', 'client_kind', 'source'],
    registers: [this.registry],
  });
  private readonly oauthTokenRequests = new Counter({
    name: 'trampo_oauth_token_requests_total',
    help: 'Requisições ao endpoint de token por tipo de concessão e resultado.',
    labelNames: ['grant_type', 'result'],
    registers: [this.registry],
  });
  private readonly oauthCodeReuses = new Counter({
    name: 'trampo_oauth_code_reuse_total',
    help: 'Códigos de autorização reutilizados (sinal de roubo).',
    registers: [this.registry],
  });
  private readonly oauthRefreshReuses = new Counter({
    name: 'trampo_oauth_refresh_reuse_total',
    help: 'Refresh tokens reutilizados fora da janela (família revogada).',
    registers: [this.registry],
  });
  private readonly oauthRevocations = new Counter({
    name: 'trampo_oauth_revocations_total',
    help: 'Revogações OAuth por tipo.',
    labelNames: ['kind'],
    registers: [this.registry],
  });
  private readonly oauthAccessAuth = new Counter({
    name: 'trampo_oauth_access_token_auth_total',
    help: 'Autenticações por access token OAuth por resultado.',
    labelNames: ['result'],
    registers: [this.registry],
  });
  private readonly cimdFetches = new Counter({
    name: 'trampo_oauth_cimd_fetch_total',
    help: 'Buscas de documentos CIMD por resultado.',
    labelNames: ['result'],
    registers: [this.registry],
  });
  private readonly cimdDuration = new Histogram({
    name: 'trampo_oauth_cimd_fetch_duration_seconds',
    help: 'Duração da busca de documentos CIMD.',
    labelNames: ['result'],
    buckets: SECONDS_BUCKETS,
    registers: [this.registry],
  });
  private readonly cimdCache = new Counter({
    name: 'trampo_oauth_cimd_cache_total',
    help: 'Acertos e erros do cache de CIMD.',
    labelNames: ['result'],
    registers: [this.registry],
  });
  private readonly cleanupDeleted = new Counter({
    name: 'trampo_oauth_cleanup_deleted_total',
    help: 'Linhas apagadas pela limpeza do OAuth, por tabela.',
    labelNames: ['table'],
    registers: [this.registry],
  });
  readonly cleanupLastSuccess = new Gauge({
    name: 'trampo_oauth_cleanup_last_success_timestamp_seconds',
    help: 'Instante da última limpeza bem-sucedida.',
    registers: [this.registry],
  });
  private readonly cleanupFailures = new Counter({
    name: 'trampo_oauth_cleanup_failures_total',
    help: 'Falhas da limpeza do OAuth.',
    registers: [this.registry],
  });

  // --- estoques de negócio (atualizados pelo BusinessGaugesService)
  readonly users = new Gauge({
    name: 'trampo_users',
    help: 'Usuários por estado de verificação e provedor.',
    labelNames: ['state', 'provider'],
    registers: [this.registry],
  });
  readonly usersActive = new Gauge({
    name: 'trampo_users_active',
    help: 'Usuários com candidatura criada ou alterada na janela.',
    labelNames: ['window'],
    registers: [this.registry],
  });
  readonly usersFunnel = new Gauge({
    name: 'trampo_users_funnel',
    help: 'Usuários em cada etapa do funil de ativação.',
    labelNames: ['stage'],
    registers: [this.registry],
  });
  readonly usersWithApplications = new Gauge({
    name: 'trampo_users_with_applications',
    help: 'Usuários com pelo menos N candidaturas.',
    labelNames: ['at_least'],
    registers: [this.registry],
  });
  readonly applications = new Gauge({
    name: 'trampo_applications',
    help: 'Candidaturas não excluídas por status.',
    labelNames: ['status'],
    registers: [this.registry],
  });
  readonly applicationsStale = new Gauge({
    name: 'trampo_applications_stale',
    help: 'Candidaturas abertas sem alteração há N dias.',
    labelNames: ['days'],
    registers: [this.registry],
  });
  readonly patActive = new Gauge({
    name: 'trampo_pat_active',
    help: 'Tokens de integração ativos por escopo.',
    labelNames: ['scope'],
    registers: [this.registry],
  });
  readonly oauthGrantsActive = new Gauge({
    name: 'trampo_oauth_grants_active',
    help: 'Aplicativos conectados (grants ativos).',
    registers: [this.registry],
  });
  readonly oauthClients = new Gauge({
    name: 'trampo_oauth_clients',
    help: 'Clientes OAuth registrados por origem.',
    labelNames: ['source'],
    registers: [this.registry],
  });
  readonly gaugesLastRefresh = new Gauge({
    name: 'trampo_business_gauges_last_refresh_timestamp_seconds',
    help: 'Instante da última atualização bem-sucedida dos estoques de negócio.',
    registers: [this.registry],
  });
  readonly gaugesRefreshFailures = new Counter({
    name: 'trampo_business_gauges_refresh_failures_total',
    help: 'Falhas ao atualizar os estoques de negócio.',
    registers: [this.registry],
  });

  constructor() {
    super();
    collectDefaultMetrics({ register: this.registry });
    this.buildInfo.set({ version: APP_VERSION, node: process.version }, 1);
  }

  /** Executa o registro sem nunca propagar um erro para quem chamou. */
  private safe(action: () => void): void {
    try {
      action();
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar métrica: ${error instanceof Error ? error.message : 'erro'}`,
      );
    }
  }

  // --- autenticação
  loginAttempted(method: LoginMethod, result: LoginResult): void {
    this.safe(() =>
      this.loginAttempts.inc({
        method: pick(method, ['password', 'google']),
        result: pick(result, [
          'success',
          'invalid_credentials',
          'blocked',
          'error',
        ]),
      }),
    );
  }

  loginLockedOut(): void {
    this.safe(() => this.loginLockouts.inc());
  }

  registrationAttempted(source: LoginMethod, result: RegistrationResult): void {
    this.safe(() =>
      this.registrations.inc({
        source: pick(source, ['password', 'google']),
        result: pick(result, ['created', 'email_taken', 'disabled', 'invalid']),
      }),
    );
  }

  googleSignIn(result: GoogleSignInResult): void {
    this.safe(() =>
      this.googleSignins.inc({
        result: pick(result, ['existing', 'created', 'failed']),
      }),
    );
  }

  emailVerification(result: EmailVerificationResult): void {
    this.safe(() =>
      this.emailVerifications.inc({
        result: pick(result, [
          'confirmed',
          'invalid',
          'expired',
          'resent',
          'rate_limited',
        ]),
      }),
    );
  }

  passwordReset(step: PasswordResetStep): void {
    this.safe(() =>
      this.passwordResets.inc({
        step: pick(step, ['requested', 'completed', 'invalid']),
      }),
    );
  }

  sessionRefreshed(result: SessionRefreshResult): void {
    this.safe(() =>
      this.sessionRefreshes.inc({
        result: pick(result, ['ok', 'missing', 'invalid', 'expired', 'reused']),
      }),
    );
  }

  loggedOut(): void {
    this.safe(() => this.logouts.inc());
  }

  guardDenied(reason: GuardDenialReason, auth: MetricAuthKind): void {
    this.safe(() =>
      this.guardDenials.inc({
        reason: pick(reason, [
          'missing_token',
          'invalid_token',
          'expired_token',
          'insufficient_scope',
          'route_closed',
          'session_only',
        ]),
        auth: pick(auth, AUTH_KINDS),
      }),
    );
  }

  personalToken(event: PersonalTokenEvent, scope: PersonalTokenScope): void {
    this.safe(() =>
      this.personalTokens.inc({
        event: pick(event, ['created', 'revoked', 'authenticated', 'rejected']),
        scope: pick(scope, ['read', 'read_write', 'unknown']),
      }),
    );
  }

  rateLimited(key: string): void {
    this.safe(() => this.rateLimitHits.inc({ rule: rateLimitRule(key) }));
  }

  // --- candidaturas
  applicationCreated(channel: MetricChannel, link: string): void {
    this.safe(() =>
      this.appsCreated.inc({
        channel: pick(channel, CHANNELS),
        source: sourceBucket(link),
      }),
    );
  }

  applicationTransition(
    from: ApplicationMetricStatus,
    to: ApplicationMetricStatus,
    channel: MetricChannel,
  ): void {
    this.safe(() =>
      this.appsTransitions.inc({
        from: pick(from, STATUSES),
        to: pick(to, STATUSES),
        channel: pick(channel, CHANNELS),
      }),
    );
  }

  applicationPhaseUpdated(channel: MetricChannel): void {
    this.safe(() =>
      this.appsPhaseUpdates.inc({ channel: pick(channel, CHANNELS) }),
    );
  }

  applicationDeleted(mode: 'soft' | 'hard'): void {
    this.safe(() =>
      this.appsDeleted.inc({ mode: pick(mode, ['soft', 'hard']) }),
    );
  }

  applicationReordered(channel: MetricChannel): void {
    this.safe(() =>
      this.appsReordered.inc({ channel: pick(channel, CHANNELS) }),
    );
  }

  jobPreview(
    status: JobPreviewMetricStatus,
    link: string,
    seconds: number,
  ): void {
    this.safe(() => {
      const safeStatus = pick(status, [
        'found',
        'no_data',
        'blocked',
        'timeout',
        'unreachable',
        'not_html',
      ]);

      this.previews.inc({ status: safeStatus, source: sourceBucket(link) });
      this.previewDuration.observe({ status: safeStatus }, seconds);
    });
  }

  // --- e-mail
  mailSent(template: MailTemplate, result: MailResult, seconds: number): void {
    this.safe(() => {
      const safeTemplate = pick(template, [
        'verification',
        'password_reset',
        'verified',
      ]);

      this.mails.inc({
        template: safeTemplate,
        result: pick(result, ['ok', 'error', 'disabled']),
      });
      this.mailDuration.observe({ template: safeTemplate }, seconds);
    });
  }

  // --- OAuth
  oauthClientRegistered(result: OAuthRegistrationResult): void {
    this.safe(() =>
      this.oauthRegistrations.inc({
        result: pick(result, [
          'created',
          'invalid_redirect_uri',
          'invalid_client_metadata',
          'limit',
          'error',
        ]),
      }),
    );
  }

  oauthAuthorization(
    decision: OAuthDecision,
    kind: OAuthClientKind,
    source: OAuthClientSourceKind,
  ): void {
    this.safe(() =>
      this.oauthAuthorizations.inc({
        decision: pick(decision, ['approved', 'denied', 'error']),
        client_kind: pick(kind, ['claude', 'other']),
        source: pick(source, ['dcr', 'cimd']),
      }),
    );
  }

  oauthTokenRequest(
    grant: OAuthGrantTypeMetric,
    result: OAuthTokenResult,
  ): void {
    this.safe(() =>
      this.oauthTokenRequests.inc({
        grant_type: pick(grant, ['authorization_code', 'refresh_token']),
        result: pick(result, [
          'ok',
          'invalid_grant',
          'invalid_request',
          'invalid_target',
          'invalid_scope',
          'invalid_client',
          'unsupported_grant_type',
          'rate_limited',
          'error',
        ]),
      }),
    );
  }

  oauthCodeReuse(): void {
    this.safe(() => this.oauthCodeReuses.inc());
  }

  oauthRefreshReuse(): void {
    this.safe(() => this.oauthRefreshReuses.inc());
  }

  oauthRevocation(kind: 'token' | 'grant'): void {
    this.safe(() =>
      this.oauthRevocations.inc({ kind: pick(kind, ['token', 'grant']) }),
    );
  }

  oauthAccessTokenAuth(result: OAuthAccessTokenResult): void {
    this.safe(() =>
      this.oauthAccessAuth.inc({
        result: pick(result, [
          'ok',
          'expired',
          'revoked',
          'audience_mismatch',
          'unknown',
        ]),
      }),
    );
  }

  oauthCimdFetch(result: CimdFetchResult, seconds: number): void {
    this.safe(() => {
      const safeResult = pick(result, [
        'ok',
        'blocked',
        'unreachable',
        'timeout',
        'not_json',
        'too_large',
        'redirect',
        'invalid',
      ]);

      this.cimdFetches.inc({ result: safeResult });
      this.cimdDuration.observe({ result: safeResult }, seconds);
    });
  }

  oauthCimdCache(result: 'hit' | 'miss'): void {
    this.safe(() =>
      this.cimdCache.inc({ result: pick(result, ['hit', 'miss']) }),
    );
  }

  oauthCleanup(deleted: Record<string, number>): void {
    this.safe(() => {
      for (const [table, count] of Object.entries(deleted)) {
        if (count > 0) {
          this.cleanupDeleted.inc(
            {
              table: pick(table, [
                'codes',
                'access_tokens',
                'refresh_tokens',
                'clients',
              ]),
            },
            count,
          );
        }
      }

      this.cleanupLastSuccess.set(Date.now() / 1000);
    });
  }

  oauthCleanupFailed(): void {
    this.safe(() => this.cleanupFailures.inc());
  }
}
