import type {
  AuthUser,
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
  ResendVerificationResponse,
  VerifyEmailInput,
} from '../auth.types';
import { apiClient } from './client';

export const authService = {
  async login(input: LoginInput): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', input);

    return data;
  },

  async register(input: RegisterInput): Promise<RegisterResponse> {
    const { data } = await apiClient.post<RegisterResponse>(
      '/auth/register',
      input,
    );

    return data;
  },

  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    await apiClient.post('/auth/verification/confirm', input);
  },

  async resendVerification(): Promise<ResendVerificationResponse> {
    const { data } = await apiClient.post<ResendVerificationResponse>(
      '/auth/verification/resend',
    );

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
