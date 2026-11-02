export const queryKeys = {
  board: (search?: string) => ['board', search?.trim() ?? ''] as const,
  application: (id: string) => ['application', id] as const,
} as const;
