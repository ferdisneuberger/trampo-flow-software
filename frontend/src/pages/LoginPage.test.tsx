import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../contexts/auth-context';
import { LoginPage } from './LoginPage';

vi.mock('../contexts/auth-context', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderLogin(state?: { from?: unknown }) {
  const login = vi.fn().mockResolvedValue(undefined);

  mockedUseAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login,
    logout: vi.fn(),
    refreshProfile: vi.fn(),
  });

  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/candidaturas" element={<p>quadro</p>} />
        <Route path="*" element={<p>outra rota</p>} />
      </Routes>
    </MemoryRouter>,
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
        emailVerified: true,
        hasPassword: true,
        termsAccepted: true,
        verificationResendAvailableAt: null,
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
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
      </MemoryRouter>,
    );

    expect(screen.getByText('quadro')).toBeInTheDocument();
  });
});
