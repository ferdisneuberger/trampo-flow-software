import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { accessTokenStore } from '../services/api/access-token';
import { authService } from '../services/api/auth.service';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../services/api/auth.service', () => ({
  authService: {
    refresh: vi.fn(),
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

const refresh = vi.mocked(authService.refresh);
const me = vi.mocked(authService.me);

function Consumer() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <p>carregando</p>;
  }

  return (
    <p>{auth.isAuthenticated ? `user:${auth.user?.username}` : 'anonimo'}</p>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessTokenStore.clear();
  });

  it('restaura a sessão e guarda o access token renovado', async () => {
    refresh.mockResolvedValue({
      accessToken: 'novo-token',
      tokenType: 'Bearer',
      expiresIn: 300,
      expiresAt: 1_800_000_000,
    });
    me.mockResolvedValue({ id: 'user-1', username: 'fernando' });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(await screen.findByText('user:fernando')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
    expect(accessTokenStore.get()).toBe('novo-token');
  });

  it('fica anônimo quando não há sessão', async () => {
    refresh.mockRejectedValue(new Error('Sem sessão.'));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(await screen.findByText('anonimo')).toBeInTheDocument();
    expect(accessTokenStore.get()).toBeNull();
  });
});
