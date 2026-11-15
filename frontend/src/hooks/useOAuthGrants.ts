import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-keys';
import { oauthService } from '../services/api/oauth.service';

/** Verdadeiro quando o servidor tem o OAuth ligado (`OAUTH_ENABLED`). */
export function useOAuthEnabled(): boolean {
  const { data } = useQuery({
    queryKey: queryKeys.oauthEnabled(),
    queryFn: () => oauthService.isEnabled(),
    staleTime: 5 * 60 * 1000,
  });

  return data === true;
}

export function useOAuthGrants(enabled = true) {
  const queryClient = useQueryClient();

  const grants = useQuery({
    queryKey: queryKeys.oauthGrants(),
    queryFn: () => oauthService.listGrants(),
    enabled,
  });

  const revoke = useMutation({
    mutationFn: (id: string) => oauthService.revokeGrant(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.oauthGrants() }),
  });

  return { grants, revoke };
}
