import type { AuthUser, LoginInput, LoginResponse } from '../auth.types';
import { apiClient } from './client';

export type RefreshResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: number;
};

export const authService = {
  async login(input: LoginInput): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', input);

    return data;
  },

  async refresh(): Promise<RefreshResponse> {
    const { data } = await apiClient.post<RefreshResponse>('/auth/refresh');

    return data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async me(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthUser>('/auth/me');

    return data;
  },
};
