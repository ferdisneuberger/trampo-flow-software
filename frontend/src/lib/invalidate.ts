import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/**
 * Invalida tudo que pode conter dados de uma candidatura: o quadro inteiro
 * (todas as buscas) e, quando informado, o detalhe daquele id.
 */
export async function invalidateApplicationData(
  queryClient: QueryClient,
  applicationId?: string,
): Promise<void> {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: ['board'] }),
  ];

  if (applicationId) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.application(applicationId),
      }),
    );
  }

  await Promise.all(invalidations);
}
