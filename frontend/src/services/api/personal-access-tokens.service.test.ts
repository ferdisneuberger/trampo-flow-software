import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './client';
import { personalAccessTokensService } from './personal-access-tokens.service';

vi.mock('./client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const client = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('personalAccessTokensService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista, cria e revoga pelas rotas /auth/tokens', async () => {
    client.get.mockResolvedValue({ data: [] });
    client.post.mockResolvedValue({ data: { id: 't1', token: 'tfp_x' } });
    client.delete.mockResolvedValue({});

    await expect(personalAccessTokensService.list()).resolves.toEqual([]);
    await expect(
      personalAccessTokensService.create({ name: 'mcp', expiresInDays: 30 }),
    ).resolves.toEqual({ id: 't1', token: 'tfp_x' });
    await personalAccessTokensService.revoke('t1');

    expect(client.get).toHaveBeenCalledWith('/auth/tokens');
    expect(client.post).toHaveBeenCalledWith('/auth/tokens', {
      name: 'mcp',
      expiresInDays: 30,
    });
    expect(client.delete).toHaveBeenCalledWith('/auth/tokens/t1');
  });
});
