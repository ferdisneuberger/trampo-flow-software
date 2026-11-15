/** Parâmetros do pedido de autorização, como vieram na URL (todos texto). */
export type OAuthAuthorizeParams = Record<string, string>;

export type AuthorizationPreview = {
  client: { name: string; verified: boolean; redirectHost: string };
  scopes: { id: string; label: string }[];
  cannotDo: string[];
};

export type ConnectedApp = {
  id: string;
  clientName: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
};

export const OAUTH_SCOPE_LABELS: Record<string, string> = {
  'applications:read': 'Ver candidaturas',
  'applications:write': 'Criar, atualizar e mover candidaturas',
};
