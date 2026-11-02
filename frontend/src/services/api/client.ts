import axios, { type InternalAxiosRequestConfig } from 'axios';
import { env } from '../../config/env';
import { accessTokenStore, AUTH_UNAUTHORIZED_EVENT } from './access-token';
import { normalizeApiError } from './errors';
import { refreshAccessToken } from './session';

type RetriableConfig = InternalAxiosRequestConfig & { retried?: boolean };

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

function isApiOrigin(url: string | undefined): boolean {
  if (!url) {
    return true;
  }

  try {
    const base = new URL(env.apiUrl, window.location.origin);

    return new URL(url, base).origin === base.origin;
  } catch {
    return false;
  }
}

function isAuthPath(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    const path = new URL(url, 'http://localhost').pathname;

    return ['/auth/login', '/auth/refresh', '/auth/logout'].some(
      (authPath) => path === authPath || path.endsWith(authPath),
    );
  } catch {
    return false;
  }
}

function endSession(): void {
  accessTokenStore.clear();
  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
}

apiClient.interceptors.request.use((config) => {
  const token = accessTokenStore.get();

  if (token && isApiOrigin(config.url)) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(normalizeApiError(error));
    }

    const config = error.config as RetriableConfig | undefined;
    const code = (error.response.data as { code?: string } | undefined)?.code;
    const authRequest = isAuthPath(config?.url);

    if (code === 'TOKEN_EXPIRED' && config && !config.retried && !authRequest) {
      config.retried = true;

      let accessToken: string;

      try {
        accessToken = (await refreshAccessToken()).accessToken;
      } catch {
        endSession();

        return Promise.reject(normalizeApiError(error));
      }

      config.headers.set('Authorization', `Bearer ${accessToken}`);

      // Erros do retry seguem o fluxo normal (inclusive 500/rede) e não
      // devem encerrar a sessão: o refresh já foi concluído com sucesso.
      return apiClient.request(config);
    }

    if (!authRequest) {
      endSession();
    }

    return Promise.reject(normalizeApiError(error));
  },
);
