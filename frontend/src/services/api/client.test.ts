import axios, {
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { accessTokenStore, AUTH_UNAUTHORIZED_EVENT } from './access-token';
import { apiClient } from './client';
import { ApiError } from './errors';

const originalAdapter = apiClient.defaults.adapter;

function failWith(
  status: number,
  data: Record<string, unknown>,
  times = 1,
): AxiosAdapter {
  let calls = 0;

  return (async (config: InternalAxiosRequestConfig) => {
    calls += 1;

    if (calls <= times) {
      throw {
        isAxiosError: true,
        config,
        response: { status, data },
      };
    }

    return {
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  }) as unknown as AxiosAdapter;
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  accessTokenStore.clear();
  vi.restoreAllMocks();
});

describe('apiClient', () => {
  it('envia o token em memória no header Authorization', async () => {
    let captured: Record<string, unknown> | undefined;

    apiClient.defaults.adapter = (async (
      config: InternalAxiosRequestConfig,
    ) => {
      captured = config.headers as unknown as Record<string, unknown>;

      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    }) as unknown as AxiosAdapter;

    accessTokenStore.set('abc.def.ghi');
    await apiClient.get('/applications');

    expect(captured?.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('renova o access token e repete a requisição quando expira', async () => {
    apiClient.defaults.adapter = failWith(401, { code: 'TOKEN_EXPIRED' });
    const refresh = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { accessToken: 'novo-token' } });

    accessTokenStore.set('antigo');
    const response = await apiClient.get('/applications');

    expect(refresh).toHaveBeenCalledWith(
      '/api/auth/refresh',
      null,
      expect.any(Object),
    );
    expect(response.data).toEqual({ ok: true });
    expect(accessTokenStore.get()).toBe('novo-token');
  });

  it('não tenta renovar mais de uma vez na mesma requisição', async () => {
    apiClient.defaults.adapter = failWith(401, { code: 'TOKEN_EXPIRED' }, 2);
    const refresh = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { accessToken: 'novo-token' } });

    await expect(apiClient.get('/applications')).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('encerra a sessão quando a renovação falha', async () => {
    const listener = vi.fn();

    apiClient.defaults.adapter = failWith(401, { code: 'TOKEN_EXPIRED' });
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('sem sessão'));
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);

    accessTokenStore.set('antigo');
    await expect(apiClient.get('/applications')).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(accessTokenStore.get()).toBeNull();
    expect(listener).toHaveBeenCalledOnce();

    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  });

  it('encerra a sessão em 401 sem código de expiração', async () => {
    const listener = vi.fn();

    apiClient.defaults.adapter = failWith(401, { code: 'UNAUTHORIZED' });
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);

    accessTokenStore.set('token');
    await expect(apiClient.get('/applications')).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(listener).toHaveBeenCalledOnce();

    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  });

  it('não encerra a sessão quando o 401 vem do login', async () => {
    const listener = vi.fn();

    apiClient.defaults.adapter = failWith(401, { code: 'UNAUTHORIZED' });
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);

    await expect(
      apiClient.post('/auth/login', { username: 'a', password: 'b' }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  });
});
