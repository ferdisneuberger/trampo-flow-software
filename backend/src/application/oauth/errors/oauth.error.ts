import { ApplicationError } from '../../shared/errors/application.error';

export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'invalid_scope'
  | 'invalid_target'
  | 'invalid_redirect_uri'
  | 'invalid_client_metadata'
  | 'access_denied'
  | 'temporarily_unavailable';

/**
 * Erro do servidor de autorização. `code` segue a RFC 6749/7591 e `message` é
 * o `error_description`. Nos endpoints públicos o filtro RFC 6749 o formata; nas
 * rotas de consentimento o filtro de domínio devolve `{ error, message }`.
 */
export class OAuthError extends ApplicationError {
  constructor(
    code: OAuthErrorCode,
    description: string,
    readonly status = 400,
  ) {
    super(description, code);
    this.name = 'OAuthError';
  }
}
