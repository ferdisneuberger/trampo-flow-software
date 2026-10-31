import axios from 'axios';
import { env } from '../../config/env';
import { normalizeApiError } from './errors';
import {
  AUTH_UNAUTHORIZED_EVENT,
  tokenStorage,
} from './token-storage';

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');

      if (!isLoginRequest) {
        tokenStorage.clear();
        window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);
