export const SCOPE_APPLICATIONS_READ = 'applications:read';
export const SCOPE_APPLICATIONS_WRITE = 'applications:write';

export const READ_ONLY_SCOPE = SCOPE_APPLICATIONS_READ;
export const READ_WRITE_SCOPE = `${SCOPE_APPLICATIONS_READ} ${SCOPE_APPLICATIONS_WRITE}`;

/** Combinações que um token de integração (`tfp_`) pode receber ao ser criado. */
export const PERSONAL_ACCESS_TOKEN_SCOPES = [
  READ_ONLY_SCOPE,
  READ_WRITE_SCOPE,
] as const;

export function parseScope(scope: string): string[] {
  return scope.split(/\s+/).filter(Boolean);
}

/** Pertencimento exato: escrever não implica ler (os tokens sempre levam os dois). */
export function hasScope(
  granted: readonly string[],
  required: string,
): boolean {
  return granted.includes(required);
}
