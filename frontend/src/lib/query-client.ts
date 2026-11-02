import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../services/api/errors';

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) {
    return false;
  }

  if (error instanceof ApiError) {
    // Erros de rede/timeout não têm status e merecem uma segunda tentativa.
    return error.status === undefined || error.status >= 500;
  }

  return false;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
});
