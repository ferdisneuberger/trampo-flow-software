import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-keys';
import { personalAccessTokensService } from '../services/api/personal-access-tokens.service';
import type { CreatePersonalAccessTokenInput } from '../services/personal-access-tokens.types';

export function usePersonalAccessTokens() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.personalAccessTokens(),
    });

  const tokens = useQuery({
    queryKey: queryKeys.personalAccessTokens(),
    queryFn: () => personalAccessTokensService.list(),
  });

  const create = useMutation({
    mutationFn: (input: CreatePersonalAccessTokenInput) =>
      personalAccessTokensService.create(input),
    onSuccess: invalidate,
  });

  const revoke = useMutation({
    mutationFn: (id: string) => personalAccessTokensService.revoke(id),
    onSuccess: invalidate,
  });

  return { tokens, create, revoke };
}
