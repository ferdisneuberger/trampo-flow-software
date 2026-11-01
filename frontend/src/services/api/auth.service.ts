import type { AuthUser, LoginInput, LoginResponse } from '../auth.types';
import { apiClient } from './client';

export const authService = {
  async login(input: LoginInput): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', input);

    return data;
  },

  async me(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthUser>('/auth/me');

    return data;
  },
};
