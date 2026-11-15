export type PersonalAccessToken = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

export type CreatedPersonalAccessToken = PersonalAccessToken & {
  /** Segredo `tfp_...`: a API só devolve na criação. */
  token: string;
};

export type CreatePersonalAccessTokenInput = {
  name: string;
  expiresInDays: number;
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
