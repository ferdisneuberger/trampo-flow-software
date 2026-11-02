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
      user: { id: 'u1', username: 'fernando' },
    };
    client.post.mockResolvedValue({ data: response });

    await expect(
      authService.login({ username: 'fernando', password: 'segredo' }),
    ).resolves.toEqual(response);
    expect(client.post).toHaveBeenCalledWith('/auth/login', {
      username: 'fernando',
      password: 'segredo',
    });
  });

  it('faz logout', async () => {
    client.post.mockResolvedValue({});

    await authService.logout();

    expect(client.post).toHaveBeenCalledWith('/auth/logout');
  });

  it('busca o perfil', async () => {
    client.get.mockResolvedValue({ data: { id: 'u1', username: 'fernando' } });

    await expect(authService.me()).resolves.toEqual({
      id: 'u1',
      username: 'fernando',
    });
    expect(client.get).toHaveBeenCalledWith('/auth/me');
  });
});
