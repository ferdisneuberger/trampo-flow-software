import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import { ApiError } from './errors';
import { AUTH_UNAUTHORIZED_EVENT, tokenStorage } from './token-storage';

const originalAdapter = apiClient.defaults.adapter;

function respondWith401(url: string): void {
  apiClient.defaults.adapter = (async () => {
    throw {
      isAxiosError: true,
      config: { url },
      response: { status: 401, data: { message: 'Token inválido.' } },
    };
  }) as unknown as AxiosAdapter;
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe('apiClient', () => {
  it('envia o token no header Authorization', async () => {
    let captured: Record<string, unknown> | undefined;

    apiClient.defaults.adapter = (async (
      config: InternalAxiosRequestConfig,
    ) => {
      captured = config.headers as unknown as Record<string, unknown>;

      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    }) as unknown as AxiosAdapter;

    tokenStorage.set('abc.def.ghi');
    await apiClient.get('/applications');

    expect(captured?.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('limpa o token e dispara evento quando a API responde 401', async () => {
    const listener = vi.fn();

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
    tokenStorage.set('abc.def.ghi');
    respondWith401('/applications');

    await expect(apiClient.get('/applications')).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(tokenStorage.get()).toBeNull();
    expect(listener).toHaveBeenCalledOnce();

    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  });

  it('não limpa o token quando o 401 vem do próprio login', async () => {
    const listener = vi.fn();

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
    tokenStorage.set('abc.def.ghi');
    respondWith401('/auth/login');

    await expect(
      apiClient.post('/auth/login', { username: 'a', password: 'b' }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(tokenStorage.get()).toBe('abc.def.ghi');
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  });
});
