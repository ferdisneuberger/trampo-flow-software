import { describe, expect, it } from 'vitest';
import { ApiError } from '../services/api/errors';
import { queryClient } from './query-client';

const retry = queryClient.getDefaultOptions().queries?.retry as (
  failureCount: number,
  error: unknown,
) => boolean;

describe('queryClient', () => {
  it('repete uma vez erros de rede e 5xx', () => {
    expect(retry(0, new ApiError('rede', undefined, 'NETWORK_ERROR'))).toBe(
      true,
    );
    expect(retry(0, new ApiError('servidor', 500))).toBe(true);
  });

  it('não repete 4xx, erros desconhecidos nem depois da primeira tentativa', () => {
    expect(retry(0, new ApiError('validação', 400))).toBe(false);
    expect(retry(1, new ApiError('servidor', 500))).toBe(false);
    expect(retry(0, new Error('qualquer'))).toBe(false);
  });
});
