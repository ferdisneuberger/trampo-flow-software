import axios, { type InternalAxiosRequestConfig } from 'axios';
import { env } from '../../config/env';
import { accessTokenStore, AUTH_UNAUTHORIZED_EVENT } from './access-token';
import { normalizeApiError } from './errors';

type RetriableConfig = InternalAxiosRequestConfig & { retried?: boolean };

type RefreshResponse = {
  accessToken: string;
};

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshInFlight: Promise<string> | null = null;

async function requestNewAccessToken(): Promise<string> {
  refreshInFlight ??= axios
    .post<RefreshResponse>(`${env.apiUrl}/auth/refresh`, null, {
      headers: { 'Content-Type': 'application/json' },
    })
    .then((response) => {
      accessTokenStore.set(response.data.accessToken);

      return response.data.accessToken;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

function endSession(): void {
  accessTokenStore.clear();
  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
}

apiClient.interceptors.request.use((config) => {
  const token = accessTokenStore.get();

  if (token) {
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
    const isAuthRequest =
      config?.url?.includes('/auth/login') ||
      config?.url?.includes('/auth/refresh') ||
      config?.url?.includes('/auth/logout');

    if (
      code === 'TOKEN_EXPIRED' &&
      config &&
      !config.retried &&
      !isAuthRequest
    ) {
      config.retried = true;

      try {
        const token = await requestNewAccessToken();
        config.headers.set('Authorization', `Bearer ${token}`);

        return await apiClient.request(config);
      } catch {
        endSession();
      }
    } else if (!isAuthRequest) {
      endSession();
    }

    return Promise.reject(normalizeApiError(error));
  },
);
