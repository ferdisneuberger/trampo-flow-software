import type {
  AuthUser,
  ForgotPasswordInput,
  GoogleLoginInput,
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
  ResendVerificationResponse,
  ResetPasswordInput,
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

  async googleLogin(input: GoogleLoginInput): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/auth/google', input);

    return data;
  },

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    await apiClient.post('/auth/password/forgot', input);
  },

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await apiClient.post('/auth/password/reset', input);
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
