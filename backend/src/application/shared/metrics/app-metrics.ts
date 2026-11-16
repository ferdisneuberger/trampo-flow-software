/**
 * Porta de métricas da aplicação. Os casos de uso e controladores falam com ela
 * por eventos de negócio nomeados, sem conhecer o Prometheus. Todos os valores
 * dos parâmetros vêm de listas **fechadas** (nunca texto livre, id, e-mail ou
 * IP): é o que mantém a cardinalidade das séries sob controle.
 */

/** Como a requisição chegou: interface, token de integração ou OAuth. */
export type MetricChannel = 'web' | 'agent_token' | 'agent_oauth';

export type MetricAuthKind = 'jwt' | 'pat' | 'oauth' | 'anonymous';

export type LoginMethod = 'password' | 'google';
export type LoginResult =
  'success' | 'invalid_credentials' | 'blocked' | 'error';

export type RegistrationResult =
  'created' | 'email_taken' | 'disabled' | 'invalid';

export type GoogleSignInResult = 'existing' | 'created' | 'failed';

export type EmailVerificationResult =
  'confirmed' | 'invalid' | 'expired' | 'resent' | 'rate_limited';

export type PasswordResetStep = 'requested' | 'completed' | 'invalid';

export type SessionRefreshResult =
  'ok' | 'missing' | 'invalid' | 'expired' | 'reused';

export type GuardDenialReason =
  | 'missing_token'
  | 'invalid_token'
  | 'expired_token'
  | 'insufficient_scope'
  | 'route_closed'
  | 'session_only';

export type PersonalTokenEvent =
  'created' | 'revoked' | 'authenticated' | 'rejected';
export type PersonalTokenScope = 'read' | 'read_write' | 'unknown';

export type ApplicationMetricStatus =
  'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

export type JobPreviewMetricStatus =
  | 'found'
  | 'no_data'
  | 'blocked'
  | 'timeout'
  | 'unreachable'
  | 'not_html'
  | 'other';

export type MailTemplate = 'verification' | 'password_reset' | 'verified';
export type MailResult = 'ok' | 'error' | 'disabled';

export type OAuthRegistrationResult =
  | 'created'
  | 'invalid_redirect_uri'
  | 'invalid_client_metadata'
  | 'limit'
  | 'error';
export type OAuthDecision = 'approved' | 'denied' | 'error';
export type OAuthClientKind = 'claude' | 'other';
export type OAuthClientSourceKind = 'dcr' | 'cimd';
export type OAuthGrantTypeMetric =
  'authorization_code' | 'refresh_token' | 'other';
export type OAuthTokenResult =
  | 'ok'
  | 'invalid_grant'
  | 'invalid_request'
  | 'invalid_target'
  | 'invalid_scope'
  | 'invalid_client'
  | 'unsupported_grant_type'
  | 'rate_limited'
  | 'error';
export type OAuthAccessTokenResult =
  'ok' | 'expired' | 'revoked' | 'audience_mismatch' | 'unknown';
export type CimdFetchResult =
  | 'ok'
  | 'blocked'
  | 'unreachable'
  | 'timeout'
  | 'not_json'
  | 'too_large'
  | 'redirect'
  | 'invalid';

export abstract class AppMetrics {
  // --- autenticação e sessão
  abstract loginAttempted(method: LoginMethod, result: LoginResult): void;
  abstract loginLockedOut(): void;
  abstract registrationAttempted(
    source: LoginMethod,
    result: RegistrationResult,
  ): void;
  abstract googleSignIn(result: GoogleSignInResult): void;
  abstract emailVerification(result: EmailVerificationResult): void;
  abstract passwordReset(step: PasswordResetStep): void;
  abstract sessionRefreshed(result: SessionRefreshResult): void;
  abstract loggedOut(): void;
  abstract guardDenied(reason: GuardDenialReason, auth: MetricAuthKind): void;
  abstract personalToken(
    event: PersonalTokenEvent,
    scope: PersonalTokenScope,
  ): void;
  /** `key` é a chave do limitador (ex.: `google:ip:1.2.3.4`); só o prefixo vira rótulo. */
  abstract rateLimited(key: string): void;

  // --- candidaturas
  abstract applicationCreated(channel: MetricChannel, link: string): void;
  abstract applicationTransition(
    from: ApplicationMetricStatus,
    to: ApplicationMetricStatus,
    channel: MetricChannel,
  ): void;
  abstract applicationPhaseUpdated(channel: MetricChannel): void;
  abstract applicationDeleted(mode: 'soft' | 'hard'): void;
  abstract applicationReordered(channel: MetricChannel): void;
  abstract jobPreview(
    status: JobPreviewMetricStatus,
    link: string,
    seconds: number,
  ): void;

  // --- e-mail
  abstract mailSent(
    template: MailTemplate,
    result: MailResult,
    seconds: number,
  ): void;

  // --- OAuth
  abstract oauthClientRegistered(result: OAuthRegistrationResult): void;
  abstract oauthAuthorization(
    decision: OAuthDecision,
    kind: OAuthClientKind,
    source: OAuthClientSourceKind,
  ): void;
  abstract oauthTokenRequest(
    grant: OAuthGrantTypeMetric,
    result: OAuthTokenResult,
  ): void;
  abstract oauthCodeReuse(): void;
  abstract oauthRefreshReuse(): void;
  abstract oauthRevocation(kind: 'token' | 'grant'): void;
  abstract oauthAccessTokenAuth(result: OAuthAccessTokenResult): void;
  abstract oauthCimdFetch(result: CimdFetchResult, seconds: number): void;
  abstract oauthCimdCache(result: 'hit' | 'miss'): void;
  abstract oauthCleanup(deleted: Record<string, number>): void;
  abstract oauthCleanupFailed(): void;
}

/** Implementação nula: o padrão dos testes e de quem não liga as métricas. */
export class NoopAppMetrics extends AppMetrics {
  loginAttempted(): void {}
  loginLockedOut(): void {}
  registrationAttempted(): void {}
  googleSignIn(): void {}
  emailVerification(): void {}
  passwordReset(): void {}
  sessionRefreshed(): void {}
  loggedOut(): void {}
  guardDenied(): void {}
  personalToken(): void {}
  rateLimited(): void {}
  applicationCreated(): void {}
  applicationTransition(): void {}
  applicationPhaseUpdated(): void {}
  applicationDeleted(): void {}
  applicationReordered(): void {}
  jobPreview(): void {}
  mailSent(): void {}
  oauthClientRegistered(): void {}
  oauthAuthorization(): void {}
  oauthTokenRequest(): void {}
  oauthCodeReuse(): void {}
  oauthRefreshReuse(): void {}
  oauthRevocation(): void {}
  oauthAccessTokenAuth(): void {}
  oauthCimdFetch(): void {}
  oauthCimdCache(): void {}
  oauthCleanup(): void {}
  oauthCleanupFailed(): void {}
}
