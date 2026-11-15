/** Callbacks do Claude (web, Desktop e celular). A Anthropic avisa que pode migrar de domínio. */
export const CLAUDE_REDIRECT_URIS = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback',
] as const;

/** Origens cujo documento CIMD é considerado "verificado" (a do próprio Claude). */
export const CLAUDE_ORIGINS = ['https://claude.ai', 'https://claude.com'];

export const MAX_REDIRECT_URI_LENGTH = 2048;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function parse(uri: string): URL | null {
  if (
    uri.length === 0 ||
    uri.length > MAX_REDIRECT_URI_LENGTH ||
    /[\u0000- \u007f\\]/.test(uri)
  ) {
    return null;
  }

  try {
    return new URL(uri);
  } catch {
    return null;
  }
}

function isLoopback(url: URL): boolean {
  return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
}

/**
 * Política única para DCR e CIMD: o `redirect_uri` precisa ser um callback do
 * Claude, uma URL de loopback (RFC 8252, qualquer porta) ou constar em
 * `OAUTH_EXTRA_REDIRECT_URIS`. Qualquer outro esquema ou host é recusado.
 */
export function isAllowedRedirectUri(
  uri: string,
  extraAllowed: readonly string[] = [],
): boolean {
  const url = parse(uri);

  if (!url || url.hash || url.username || url.password) {
    return false;
  }

  if (
    (CLAUDE_REDIRECT_URIS as readonly string[]).includes(uri) ||
    extraAllowed.includes(uri)
  ) {
    return true;
  }

  return isLoopback(url);
}

/**
 * Compara o `redirect_uri` do pedido com os registrados: igualdade exata, com a
 * única exceção do loopback, que ignora a porta (RFC 8252 §7.3).
 */
export function matchesRegisteredRedirectUri(
  requested: string,
  registered: readonly string[],
): boolean {
  if (registered.includes(requested)) {
    return true;
  }

  const requestedUrl = parse(requested);

  if (!requestedUrl || !isLoopback(requestedUrl)) {
    return false;
  }

  return registered.some((candidate) => {
    const url = parse(candidate);

    return (
      url !== null &&
      isLoopback(url) &&
      url.hostname === requestedUrl.hostname &&
      url.pathname === requestedUrl.pathname &&
      url.search === requestedUrl.search
    );
  });
}

export function isClaudeRedirectUri(uri: string): boolean {
  return (CLAUDE_REDIRECT_URIS as readonly string[]).includes(uri);
}
