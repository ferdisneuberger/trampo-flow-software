import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/**
 * Invalida tudo que pode conter dados de uma candidatura: o quadro inteiro
 * (todas as buscas) e, quando informado, o detalhe daquele id.
 */
export function invalidateApplicationData(
  queryClient: QueryClient,
  applicationId?: string,
): void {
  void queryClient.invalidateQueries({ queryKey: ['board'] });

  if (applicationId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.application(applicationId),
    });
  }
}
