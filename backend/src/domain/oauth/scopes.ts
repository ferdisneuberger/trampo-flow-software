import {
  READ_WRITE_SCOPE,
  SCOPE_APPLICATIONS_READ,
  SCOPE_APPLICATIONS_WRITE,
  parseScope,
} from '../auth/scopes';

export const SCOPE_OFFLINE_ACCESS = 'offline_access';

/** Escopos que o servidor de autorização aceita e anuncia. */
export const OAUTH_SUPPORTED_SCOPES = [
  SCOPE_APPLICATIONS_READ,
  SCOPE_APPLICATIONS_WRITE,
  SCOPE_OFFLINE_ACCESS,
] as const;

const APPLICATION_SCOPES: readonly string[] = [
  SCOPE_APPLICATIONS_READ,
  SCOPE_APPLICATIONS_WRITE,
];

/**
 * Normaliza o `scope` pedido. Vazio vira leitura e escrita; escopo
 * desconhecido devolve `null` (o chamador responde `invalid_scope`).
 * `offline_access` é aceito, mas não dá acesso a nada por si só.
 */
export function normalizeRequestedScope(
  scope: string | undefined,
): string[] | null {
  const requested = [...new Set(parseScope(scope ?? ''))];

  if (
    requested.some(
      (item) => !(OAUTH_SUPPORTED_SCOPES as readonly string[]).includes(item),
    )
  ) {
    return null;
  }

  const applicationScopes = requested.filter((item) =>
    APPLICATION_SCOPES.includes(item),
  );
  const result =
    applicationScopes.length > 0
      ? applicationScopes
      : parseScope(READ_WRITE_SCOPE);

  return requested.includes(SCOPE_OFFLINE_ACCESS)
    ? [...result, SCOPE_OFFLINE_ACCESS]
    : result;
}

/** Escopos que o guard confere (sem `offline_access`). */
export function accessScopes(scope: string): string[] {
  return parseScope(scope).filter((item) => APPLICATION_SCOPES.includes(item));
}

export function isSubsetOfScope(requested: string[], granted: string): boolean {
  const allowed = parseScope(granted);

  return requested.every((item) => allowed.includes(item));
}

export { SCOPE_APPLICATIONS_READ, SCOPE_APPLICATIONS_WRITE };
