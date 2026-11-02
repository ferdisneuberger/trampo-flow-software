import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  accessTokenStore,
  AUTH_UNAUTHORIZED_EVENT,
} from '../services/api/access-token';
import { authService } from '../services/api/auth.service';
import { refreshAccessToken } from '../services/api/session';
import { AuthProvider } from './AuthContext';
import { useAuth } from './auth-context';

vi.mock('../services/api/auth.service', () => ({
  authService: {
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../services/api/session', () => ({
  refreshAccessToken: vi.fn(),
}));

const me = vi.mocked(authService.me);
const logout = vi.mocked(authService.logout);
const refresh = vi.mocked(refreshAccessToken);

function Consumer() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <p>carregando</p>;
  }

  return (
    <div>
      <p>{auth.isAuthenticated ? `user:${auth.user?.username}` : 'anonimo'}</p>
      <button type="button" onClick={() => void auth.logout()}>
        sair
      </button>
    </div>
  );
}

function renderProvider(client = new QueryClient()) {
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }

  return {
    client,
    ...render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
      { wrapper: Wrapper },
    ),
  };
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessTokenStore.clear();
  });

  it('restaura a sessão e guarda o access token renovado', async () => {
    refresh.mockImplementation(async () => {
      accessTokenStore.set('novo-token');

      return {
        accessToken: 'novo-token',
        tokenType: 'Bearer',
        expiresIn: 300,
        expiresAt: 1_800_000_000,
      };
    });
    me.mockResolvedValue({ id: 'user-1', username: 'fernando' });

    renderProvider();

    expect(await screen.findByText('user:fernando')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
    expect(accessTokenStore.get()).toBe('novo-token');
  });

  it('fica anônimo quando não há sessão', async () => {
    refresh.mockRejectedValue(new Error('Sem sessão.'));

    renderProvider();

    expect(await screen.findByText('anonimo')).toBeInTheDocument();
    expect(accessTokenStore.get()).toBeNull();
  });

  it('limpa o cache de queries no logout', async () => {
    refresh.mockRejectedValue(new Error('Sem sessão.'));
    const { client } = renderProvider();

    client.setQueryData(['board', ''], { columns: [] });
    await screen.findByText('anonimo');

    await userEvent.click(screen.getByRole('button', { name: 'sair' }));

    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(client.getQueryData(['board', ''])).toBeUndefined();
  });

  it('limpa sessão e cache quando a API sinaliza unauthorized', async () => {
    refresh.mockImplementation(async () => {
      accessTokenStore.set('token');

      return {
        accessToken: 'token',
        tokenType: 'Bearer',
        expiresIn: 300,
        expiresAt: 1_800_000_000,
      };
    });
    me.mockResolvedValue({ id: 'user-1', username: 'fernando' });
    const { client } = renderProvider();
    await screen.findByText('user:fernando');

    client.setQueryData(['board', ''], { columns: [] });
    act(() => {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    });

    expect(await screen.findByText('anonimo')).toBeInTheDocument();
    expect(accessTokenStore.get()).toBeNull();
    expect(client.getQueryData(['board', ''])).toBeUndefined();
  });
});
