/**
 * Devolve a URL apenas quando o protocolo é http/https. Qualquer outro
 * esquema (javascript:, data:, etc.) é rejeitado antes de virar href.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/**
 * Devolve apenas o hostname (sem `www.`) de uma URL http/https. Usado para
 * exibir links longos de forma legível na interface.
 */
export function formatUrlHost(value: string | null | undefined): string | null {
  const safeUrl = safeHttpUrl(value);

  if (!safeUrl) {
    return null;
  }

  const host = new URL(safeUrl).hostname.replace(/^www\./, '');

  return host.length > 0 ? host : null;
}

/**
 * Valida um destino interno de redirecionamento recebido via location.state.
 * Rejeita URLs absolutas, protocol-relative e variações com backslash/controle.
 */
export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\') ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return null;
  }

  return value;
}
