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
import { ThemeProvider } from './ThemeContext';
import { THEME_STORAGE_KEY, useTheme } from './theme-context';

vi.mock('../services/api/auth.service', () => ({
  authService: {
    me: vi.fn(),
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    updateThemePreference: vi.fn(),
  },
}));

vi.mock('../services/api/session', () => ({
  refreshAccessToken: vi.fn(),
}));

const me = vi.mocked(authService.me);
const logout = vi.mocked(authService.logout);
const refresh = vi.mocked(refreshAccessToken);
const updateThemePreference = vi.mocked(authService.updateThemePreference);

function makeProfile(themePreference: 'light' | 'dark' | 'system' = 'light') {
  return {
    id: 'user-1',
    email: 'fernando@example.com',
    firstName: 'Fernando',
    lastName: 'Neuberger',
    emailVerified: true,
    hasPassword: true,
    termsAccepted: true,
    themePreference,
    verificationResendAvailableAt: null,
  };
}

function Consumer() {
  const auth = useAuth();
  const { theme, setTheme } = useTheme();

  if (auth.isLoading) {
    return <p>carregando</p>;
  }

  return (
    <div>
      <p>{auth.isAuthenticated ? `user:${auth.user?.email}` : 'anonimo'}</p>
      <p>tema:{theme}</p>
      <p>reenvio:{auth.user?.verificationResendAvailableAt ?? 'nenhum'}</p>
      <button type="button" onClick={() => void auth.logout()}>
        sair
      </button>
      <button type="button" onClick={() => setTheme('dark')}>
        alternar local
      </button>
      <button type="button" onClick={() => setTheme('light')}>
        alternar claro
      </button>
    </div>
  );
}

function renderProvider(client = new QueryClient()) {
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
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
    me.mockResolvedValue({
      id: 'user-1',
      email: 'fernando@example.com',
      firstName: 'Fernando',
      lastName: 'Neuberger',
      emailVerified: true,
      hasPassword: true,
      termsAccepted: true,
      themePreference: 'light',
      verificationResendAvailableAt: null,
    });

    renderProvider();

    expect(
      await screen.findByText('user:fernando@example.com'),
    ).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
    expect(accessTokenStore.get()).toBe('novo-token');
  });

  it('aplica o tema salvo no perfil ao restaurar a sessão', async () => {
    refresh.mockResolvedValue({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresIn: 300,
      expiresAt: 1_800_000_000,
    });
    me.mockResolvedValue(makeProfile('dark'));

    renderProvider();

    expect(await screen.findByText('tema:dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
  });

  it('mantém o cooldown de reenvio ao salvar o tema', async () => {
    const resendAvailableAt = '2026-11-07T12:02:00.000Z';

    refresh.mockResolvedValue({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresIn: 300,
      expiresAt: 1_800_000_000,
    });
    me.mockResolvedValue({
      ...makeProfile('light'),
      emailVerified: false,
      verificationResendAvailableAt: resendAvailableAt,
    });
    updateThemePreference.mockResolvedValue({
      ...makeProfile('dark'),
      emailVerified: false,
    });

    renderProvider();

    await screen.findByText(`reenvio:${resendAvailableAt}`);
    await userEvent.click(
      screen.getByRole('button', { name: 'alternar local' }),
    );

    await waitFor(() => expect(updateThemePreference).toHaveBeenCalledOnce());
    expect(screen.getByText('tema:dark')).toBeInTheDocument();
    expect(
      screen.getByText(`reenvio:${resendAvailableAt}`),
    ).toBeInTheDocument();
  });

  it('não volta para um tema antigo quando a resposta chega atrasada', async () => {
    refresh.mockResolvedValue({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresIn: 300,
      expiresAt: 1_800_000_000,
    });
    me.mockResolvedValue(makeProfile('light'));

    let resolveDark: (
      profile: ReturnType<typeof makeProfile>,
    ) => void = () => {};
    updateThemePreference
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveDark = resolve;
          }),
      )
      .mockResolvedValueOnce(makeProfile('light'));

    renderProvider();

    await screen.findByText('tema:light');
    await userEvent.click(
      screen.getByRole('button', { name: 'alternar local' }),
    );
    await waitFor(() => expect(updateThemePreference).toHaveBeenCalledOnce());
    await userEvent.click(
      screen.getByRole('button', { name: 'alternar claro' }),
    );

    await act(async () => {
      resolveDark(makeProfile('dark'));
    });

    expect(screen.getByText('tema:light')).toBeInTheDocument();
    await waitFor(() =>
      expect(updateThemePreference).toHaveBeenLastCalledWith({
        themePreference: 'light',
      }),
    );
    expect(screen.getByText('tema:light')).toBeInTheDocument();
  });

  it('não salva na conta o tema trocado em outra aba', async () => {
    refresh.mockResolvedValue({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresIn: 300,
      expiresAt: 1_800_000_000,
    });
    me.mockResolvedValue(makeProfile('dark'));

    renderProvider();

    await screen.findByText('tema:dark');

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: THEME_STORAGE_KEY,
          newValue: 'light',
        }),
      );
    });

    expect(await screen.findByText('tema:light')).toBeInTheDocument();
    expect(updateThemePreference).not.toHaveBeenCalled();
  });

  it('persiste no backend quando o tema local muda', async () => {
    refresh.mockResolvedValue({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresIn: 300,
      expiresAt: 1_800_000_000,
    });
    me.mockResolvedValue(makeProfile('light'));
    updateThemePreference.mockResolvedValue(makeProfile('dark'));

    renderProvider();

    await screen.findByText('tema:light');
    await userEvent.click(
      screen.getByRole('button', { name: 'alternar local' }),
    );

    await waitFor(() =>
      expect(updateThemePreference).toHaveBeenCalledWith({
        themePreference: 'dark',
      }),
    );
    expect(await screen.findByText('tema:dark')).toBeInTheDocument();
  });

  it('volta ao tema claro ao sair', async () => {
    refresh.mockResolvedValue({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresIn: 300,
      expiresAt: 1_800_000_000,
    });
    me.mockResolvedValue(makeProfile('dark'));

    renderProvider();

    await screen.findByText('tema:dark');
    await userEvent.click(screen.getByRole('button', { name: 'sair' }));

    expect(await screen.findByText('tema:light')).toBeInTheDocument();
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
    me.mockResolvedValue({
      id: 'user-1',
      email: 'fernando@example.com',
      firstName: 'Fernando',
      lastName: 'Neuberger',
      emailVerified: true,
      hasPassword: true,
      termsAccepted: true,
      themePreference: 'light',
      verificationResendAvailableAt: null,
    });
    const { client } = renderProvider();
    await screen.findByText('user:fernando@example.com');

    client.setQueryData(['board', ''], { columns: [] });
    act(() => {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    });

    expect(await screen.findByText('anonimo')).toBeInTheDocument();
    expect(accessTokenStore.get()).toBeNull();
    expect(client.getQueryData(['board', ''])).toBeUndefined();
  });
});
