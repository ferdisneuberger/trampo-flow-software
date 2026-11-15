export type OAuthClientSource = 'dcr' | 'cimd';

export type OAuthClientRecord = {
  id: string;
  /** `tfc_…` no DCR; a própria URL no CIMD. */
  clientId: string;
  name: string;
  redirectUris: string[];
  source: OAuthClientSource;
  createdAt: Date;
  lastUsedAt: Date | null;
};

/** Autorização de uma pessoa a um aplicativo: a unidade que ela revoga. */
export type OAuthGrantRecord = {
  id: string;
  userId: string;
  /** Id interno (`oauth_clients.id`), não o `client_id` público. */
  clientRef: string;
  scope: string;
  resource: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export type OAuthCodeRecord = {
  id: string;
  codeHash: string;
  grantId: string;
  redirectUri: string;
  codeChallenge: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export type OAuthAccessTokenRecord = {
  id: string;
  tokenHash: string;
  grantId: string;
  scope: string;
  expiresAt: Date;
  createdAt: Date;
};

export type OAuthRefreshTokenRecord = {
  id: string;
  tokenHash: string;
  grantId: string;
  familyId: string;
  replacedBy: string | null;
  revokedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
};
