export type PersonalAccessToken = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  /** Permissões do token, por exemplo `applications:read`. */
  scope: string;
  createdAt: string;
};

export type CreatedPersonalAccessToken = PersonalAccessToken & {
  /** Segredo `tfp_...`: a API só devolve na criação. */
  token: string;
};

export type CreatePersonalAccessTokenInput = {
  name: string;
  expiresInDays: number;
  scope?: string;
};

export type PersonalAccessTokenState = 'active' | 'expired' | 'revoked';

export function getTokenState(
  token: PersonalAccessToken,
  now: Date = new Date(),
): PersonalAccessTokenState {
  if (token.revokedAt) {
    return 'revoked';
  }

  return new Date(token.expiresAt).getTime() <= now.getTime()
    ? 'expired'
    : 'active';
}

export const SCOPE_READ_WRITE = 'applications:read applications:write';
export const SCOPE_READ_ONLY = 'applications:read';

export const SCOPE_LABELS: Record<string, string> = {
  [SCOPE_READ_WRITE]: 'Leitura e escrita',
  [SCOPE_READ_ONLY]: 'Somente leitura',
};
