import { describe, expect, it } from 'vitest';
import {
  AppMetrics,
  NoopAppMetrics,
} from '../../src/application/shared/metrics/app-metrics';
import { PromAppMetrics } from '../../src/infrastructure/metrics/prom-app-metrics';

/** Argumentos válidos para cada evento da porta, com o nome da série esperada. */
function calls(metrics: AppMetrics): [string, () => void][] {
  return [
    [
      'trampo_auth_login_attempts_total',
      () => metrics.loginAttempted('password', 'success'),
    ],
    ['trampo_auth_login_lockouts_total', () => metrics.loginLockedOut()],
    [
      'trampo_auth_registrations_total',
      () => metrics.registrationAttempted('google', 'created'),
    ],
    [
      'trampo_auth_google_signins_total',
      () => metrics.googleSignIn('existing'),
    ],
    [
      'trampo_auth_email_verifications_total',
      () => metrics.emailVerification('confirmed'),
    ],
    [
      'trampo_auth_password_resets_total',
      () => metrics.passwordReset('requested'),
    ],
    [
      'trampo_auth_session_refreshes_total',
      () => metrics.sessionRefreshed('reused'),
    ],
    ['trampo_auth_logouts_total', () => metrics.loggedOut()],
    [
      'trampo_auth_guard_denials_total',
      () => metrics.guardDenied('session_only', 'pat'),
    ],
    ['trampo_pat_events_total', () => metrics.personalToken('created', 'read')],
    [
      'trampo_rate_limit_hits_total',
      () => metrics.rateLimited('register:ip:1.2.3.4'),
    ],
    [
      'trampo_applications_created_total',
      () => metrics.applicationCreated('web', 'https://gupy.io/x'),
    ],
    [
      'trampo_applications_transitions_total',
      () =>
        metrics.applicationTransition('PENDING', 'COMPLETED', 'agent_token'),
    ],
    [
      'trampo_applications_phase_updates_total',
      () => metrics.applicationPhaseUpdated('web'),
    ],
    [
      'trampo_applications_deleted_total',
      () => metrics.applicationDeleted('soft'),
    ],
    [
      'trampo_applications_reordered_total',
      () => metrics.applicationReordered('web'),
    ],
    [
      'trampo_job_preview_total',
      () => metrics.jobPreview('no_data', 'https://x.com', 1.5),
    ],
    [
      'trampo_mail_sent_total',
      () => metrics.mailSent('password_reset', 'error', 0.3),
    ],
    [
      'trampo_oauth_client_registrations_total',
      () => metrics.oauthClientRegistered('created'),
    ],
    [
      'trampo_oauth_authorizations_total',
      () => metrics.oauthAuthorization('approved', 'claude', 'cimd'),
    ],
    [
      'trampo_oauth_token_requests_total',
      () => metrics.oauthTokenRequest('refresh_token', 'invalid_grant'),
    ],
    ['trampo_oauth_code_reuse_total', () => metrics.oauthCodeReuse()],
    ['trampo_oauth_refresh_reuse_total', () => metrics.oauthRefreshReuse()],
    ['trampo_oauth_revocations_total', () => metrics.oauthRevocation('grant')],
    [
      'trampo_oauth_access_token_auth_total',
      () => metrics.oauthAccessTokenAuth('expired'),
    ],
    [
      'trampo_oauth_cimd_fetch_total',
      () => metrics.oauthCimdFetch('blocked', 0.01),
    ],
    ['trampo_oauth_cimd_cache_total', () => metrics.oauthCimdCache('hit')],
    [
      'trampo_oauth_cleanup_deleted_total',
      () => metrics.oauthCleanup({ codes: 3, refresh_tokens: 1 }),
    ],
    ['trampo_oauth_cleanup_failures_total', () => metrics.oauthCleanupFailed()],
  ];
}

describe('contrato do AppMetrics', () => {
  it('a implementação nula aceita todos os eventos sem fazer nada', () => {
    const noop = new NoopAppMetrics();

    for (const [, call] of calls(noop)) {
      expect(call).not.toThrow();
    }
  });

  it('o Prometheus registra cada evento da porta na série esperada', async () => {
    const prom = new PromAppMetrics();

    for (const [, call] of calls(prom)) {
      call();
    }

    const text = await prom.registry.metrics();

    for (const [name] of calls(prom)) {
      expect(text, name).toMatch(new RegExp(`^${name}(\\{| )`, 'm'));
    }
  });

  it('todo método da porta tem um caso neste contrato (nenhum evento fica sem teste)', () => {
    const covered = calls(new NoopAppMetrics()).length;
    const methods = Object.getOwnPropertyNames(NoopAppMetrics.prototype).filter(
      (name) => name !== 'constructor',
    );

    // 29 métodos da porta; guardDenied e personalToken etc. entram um a um acima.
    expect(methods.length).toBe(covered);
  });

  it('a limpeza do OAuth só soma o que foi apagado e marca o último sucesso', async () => {
    const prom = new PromAppMetrics();

    prom.oauthCleanup({ codes: 0, access_tokens: 0 });

    const text = await prom.registry.metrics();

    expect(text).not.toContain('trampo_oauth_cleanup_deleted_total{');
    expect(text).toMatch(
      /trampo_oauth_cleanup_last_success_timestamp_seconds \d/,
    );
  });
});
