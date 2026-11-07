import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../contexts/auth-context';
import { ThemeProvider } from '../contexts/ThemeContext';
import { LoginPage } from './LoginPage';

vi.mock('../contexts/auth-context', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderLogin(
  state?: { from?: unknown },
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    emailVerified: boolean;
    hasPassword: boolean;
    termsAccepted: boolean;
    themePreference: 'light' | 'dark' | 'system';
    verificationResendAvailableAt: string | null;
  } | null = null,
) {
  const login = vi.fn().mockResolvedValue(undefined);

  mockedUseAuth.mockReturnValue({
    user,
    isAuthenticated: user !== null,
    isLoading: false,
    login,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(),
    updateThemePreference: vi.fn(),
  });

  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/candidaturas" element={<p>quadro</p>} />
          <Route path="/verificar-email" element={<p>verificacao</p>} />
          <Route path="*" element={<p>outra rota</p>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );

  return { login };
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envia credenciais e não mostra erro no sucesso', async () => {
    const { login } = renderLogin();

    await userEvent.type(
      screen.getByLabelText('E-mail'),
      'fernando@example.com',
    );
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    expect(login).toHaveBeenCalledWith({
      email: 'fernando@example.com',
      password: 'segredo',
    });
  });

  it('mostra a mensagem quando o login falha', async () => {
    const { login } = renderLogin();

    login.mockRejectedValue(new Error('Credenciais inválidas.'));

    await userEvent.type(
      screen.getByLabelText('E-mail'),
      'fernando@example.com',
    );
    await userEvent.type(screen.getByLabelText('Senha'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: /Entrar/ }));

    expect(
      await screen.findByText('Credenciais inválidas.'),
    ).toBeInTheDocument();
  });

  it('usa /candidaturas como destino padrão e rejeita open redirect', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'fernando@example.com',
        firstName: 'Fernando',
        lastName: 'Neuberger',
        emailVerified: true,
        hasPassword: true,
        termsAccepted: true,
        themePreference: 'light',
        verificationResendAvailableAt: null,
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      updateThemePreference: vi.fn(),
    });

    render(
      <ThemeProvider>
        <MemoryRouter
          initialEntries={[
            { pathname: '/login', state: { from: '//evil.example.com' } },
          ]}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/candidaturas" element={<p>quadro</p>} />
            <Route path="*" element={<p>outra rota</p>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getByText('quadro')).toBeInTheDocument();
  });

  it('redireciona usuário não verificado para a verificação de e-mail', () => {
    renderLogin(undefined, {
      id: 'user-1',
      email: 'fernando@example.com',
      firstName: 'Fernando',
      lastName: 'Neuberger',
      emailVerified: false,
      hasPassword: true,
      termsAccepted: true,
      themePreference: 'light',
      verificationResendAvailableAt: null,
    });

    expect(screen.getByText('verificacao')).toBeInTheDocument();
  });
});
