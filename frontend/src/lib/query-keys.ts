export const queryKeys = {
  board: (search?: string) => ['board', search?.trim() ?? ''] as const,
  application: (id: string) => ['application', id] as const,
  personalAccessTokens: () => ['personal-access-tokens'] as const,
  oauthEnabled: () => ['oauth-enabled'] as const,
  oauthGrants: () => ['oauth-grants'] as const,
  oauthPreview: (search: string) => ['oauth-preview', search] as const,
} as const;
