import { describe, expect, it, vi } from 'vitest';
import { ApiError, toApiError, TrampoApiClient } from '../src/api-client.js';
import { API_URL, createFakeApi, TOKEN } from './helpers.js';

function clientWith(fetchImpl: unknown, timeoutMs = 5000) {
  return new TrampoApiClient({
    apiUrl: API_URL,
    token: TOKEN,
    timeoutMs,
    fetch: fetchImpl as typeof fetch,
  });
}

describe('TrampoApiClient', () => {
  it('envia o Bearer, JSON e a query sem valores vazios', async () => {
    const api = createFakeApi({
      'GET /applications': {
        body: { items: [], nextCursor: null, hasMore: false },
      },
    });

    await clientWith(api.fetchMock).listApplications({
      status: 'PENDING',
      search: '',
      limit: 10,
    });

    const [call] = api.calls;
    expect(call?.headers.get('authorization')).toBe(`Bearer ${TOKEN}`);
    expect(call?.query).toEqual({ status: 'PENDING', limit: '10' });
  });

  it.each([
    [
      400,
      { message: ['title must be shorter'] },
      /Dados recusados pela API: title must be shorter/,
    ],
    [401, { message: 'x' }, /inválido, expirado ou revogado.*Configurações/],
    [
      404,
      { message: 'Candidatura não encontrada.' },
      /Candidatura não encontrada. Confira o id com list_applications/,
    ],
    [429, { retryAfterSeconds: 42 }, /42 segundos/],
    [429, null, /1 minuto/],
    [503, null, /HTTP 503/],
  ])('traduz HTTP %i', (status, payload, expected) => {
    expect(toApiError(status, payload).message).toMatch(expected);
  });

  it('converte falha de rede sem vazar o token', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

    const error = (await clientWith(fetchMock)
      .getStats()
      .catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.message).not.toContain(TOKEN);
  });

  it('converte timeout', async () => {
    const timeout = Object.assign(new Error('timeout'), {
      name: 'TimeoutError',
    });
    const fetchMock = vi.fn().mockRejectedValue(timeout);

    await expect(clientWith(fetchMock, 2000).getStats()).rejects.toThrow(
      /não respondeu em 2 segundos/,
    );
  });

  it('nunca inclui o token nas mensagens de erro HTTP', async () => {
    const api = createFakeApi({
      'GET /applications/stats': {
        status: 401,
        body: { message: 'Token inválido' },
      },
    });

    const error = (await clientWith(api.fetchMock)
      .getStats()
      .catch((e: unknown) => e)) as ApiError;

    expect(error.status).toBe(401);
    expect(error.message).not.toContain(TOKEN);
  });
});
