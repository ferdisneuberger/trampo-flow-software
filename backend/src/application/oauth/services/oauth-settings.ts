/** Forma única do `resource`: minúsculas, sem barra final e sem fragmento. */
export function canonicalResource(value: string): string | null {
  try {
    const url = new URL(value);

    if (url.hash || url.username || url.password) {
      return null;
    }

    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}${url.search}`;
  } catch {
    return null;
  }
}

export class OAuthSettings {
  constructor(
    /** `OAUTH_ENABLED`: sem ela nenhuma rota OAuth existe (404). */
    readonly enabled: boolean,
    /** Sem barra final e sem caminho: idêntico ao `iss` das respostas. */
    readonly issuer: string,
    /** URL canônica do MCP, usada como audiência dos tokens. */
    readonly resource: string,
    readonly extraRedirectUris: readonly string[],
    readonly accessTokenTtlMs: number,
    readonly refreshTokenTtlMs: number,
    readonly codeTtlMs: number,
    readonly maxClients: number,
    readonly refreshGraceMs: number,
  ) {}

  get authorizationEndpoint(): string {
    return `${this.issuer}/oauth/authorize`;
  }

  get tokenEndpoint(): string {
    return `${this.issuer}/api/oauth/token`;
  }

  get registrationEndpoint(): string {
    return `${this.issuer}/api/oauth/register`;
  }

  get revocationEndpoint(): string {
    return `${this.issuer}/api/oauth/revoke`;
  }

  /** URL da metadata do recurso (RFC 9728), com o caminho do MCP no final. */
  get protectedResourceMetadataUrl(): string {
    const url = new URL(this.resource);

    return `${url.origin}/.well-known/oauth-protected-resource${url.pathname === '/' ? '' : url.pathname}`;
  }
}
