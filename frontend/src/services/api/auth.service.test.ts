import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from './auth.service';
import { apiClient } from './client';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const client = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('faz login', async () => {
    const response = {
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresIn: 300,
      expiresAt: 1,
      user: {
        id: 'u1',
        email: 'fernando@example.com',
        emailVerified: true,
        hasPassword: true,
        termsAccepted: true,
        verificationResendAvailableAt: null,
      },
    };
    client.post.mockResolvedValue({ data: response });

    await expect(
      authService.login({ email: 'fernando@example.com', password: 'segredo' }),
    ).resolves.toEqual(response);
    expect(client.post).toHaveBeenCalledWith('/auth/login', {
      email: 'fernando@example.com',
      password: 'segredo',
    });
  });

  it('cadastra uma conta', async () => {
    client.post.mockResolvedValue({ data: { message: 'ok' } });

    await expect(
      authService.register({
        email: 'pessoa@exemplo.com',
        password: 'senha-super-secreta',
        termsAccepted: true,
      }),
    ).resolves.toEqual({ message: 'ok' });
    expect(client.post).toHaveBeenCalledWith('/auth/register', {
      email: 'pessoa@exemplo.com',
      password: 'senha-super-secreta',
      termsAccepted: true,
    });
  });

  it('confirma o código de verificação', async () => {
    client.post.mockResolvedValue({});

    await authService.verifyEmail({ token: 'ADK-7YP' });

    expect(client.post).toHaveBeenCalledWith('/auth/verification/confirm', {
      token: 'ADK-7YP',
    });
  });

  it('faz login com o Google', async () => {
    const response = {
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresIn: 300,
      expiresAt: 1,
      user: {
        id: 'u1',
        email: 'pessoa@exemplo.com',
        emailVerified: true,
        hasPassword: false,
        termsAccepted: true,
        verificationResendAvailableAt: null,
      },
    };
    client.post.mockResolvedValue({ data: response });

    await expect(
      authService.googleLogin({ credential: 'google-credential' }),
    ).resolves.toEqual(response);
    expect(client.post).toHaveBeenCalledWith('/auth/google', {
      credential: 'google-credential',
    });
  });

  it('solicita recuperação de senha', async () => {
    client.post.mockResolvedValue({});

    await authService.forgotPassword({ email: 'pessoa@exemplo.com' });

    expect(client.post).toHaveBeenCalledWith('/auth/password/forgot', {
      email: 'pessoa@exemplo.com',
    });
  });

  it('redefine a senha', async () => {
    client.post.mockResolvedValue({});

    await authService.resetPassword({
      token: 'reset-token',
      password: 'senha-nova-segura',
    });

    expect(client.post).toHaveBeenCalledWith('/auth/password/reset', {
      token: 'reset-token',
      password: 'senha-nova-segura',
    });
  });

  it('faz logout', async () => {
    client.post.mockResolvedValue({});

    await authService.logout();

    expect(client.post).toHaveBeenCalledWith('/auth/logout');
  });

  it('busca o perfil', async () => {
    client.get.mockResolvedValue({
      data: {
        id: 'u1',
        email: 'fernando@example.com',
        emailVerified: true,
        hasPassword: true,
        termsAccepted: true,
        verificationResendAvailableAt: null,
      },
    });

    await expect(authService.me()).resolves.toEqual({
      id: 'u1',
      email: 'fernando@example.com',
      emailVerified: true,
      hasPassword: true,
      termsAccepted: true,
      verificationResendAvailableAt: null,
    });
    expect(client.get).toHaveBeenCalledWith('/auth/me');
  });
});
