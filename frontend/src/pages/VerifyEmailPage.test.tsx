import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../contexts/auth-context';
import { authService } from '../services/api/auth.service';
import { renderWithProviders } from '../test/render';
import { VerifyEmailPage } from './VerifyEmailPage';

vi.mock('../contexts/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/api/auth.service', () => ({
  authService: {
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
  },
}));

const mockedUseAuth = vi.mocked(useAuth);
const verifyEmail = vi.mocked(authService.verifyEmail);
const resendVerification = vi.mocked(authService.resendVerification);

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'pessoa@example.com',
    firstName: 'Fernando',
    lastName: 'Neuberger',
    emailVerified: false,
    hasPassword: true,
    termsAccepted: true,
    themePreference: 'light' as const,
    verificationResendAvailableAt: null,
    ...overrides,
  };
}

function mockAuth(
  user: ReturnType<typeof makeUser> | null,
  refreshProfile = vi.fn(),
  logout = vi.fn().mockResolvedValue(undefined),
) {
  mockedUseAuth.mockReturnValue({
    user,
    isAuthenticated: user !== null,
    isLoading: false,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout,
    refreshProfile,
    updateThemePreference: vi.fn(),
  });

  return { refreshProfile, logout };
}

function renderPage(route = '/verificar-email') {
  renderWithProviders(<VerifyEmailPage />, { route });
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyEmail.mockResolvedValue(undefined);
    resendVerification.mockResolvedValue({
      sent: true,
      retryAfterSeconds: 120,
    });
    mockAuth(null);
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('pré-preenche e remove o token do fragmento', async () => {
    window.history.replaceState(null, '', '/verificar-email#token=adk-7yp');

    renderPage('/verificar-email');

    expect(screen.getByLabelText('Código de verificação')).toHaveValue(
      'ADK-7YP',
    );
    await waitFor(() => expect(window.location.hash).toBe(''));
  });

  it('insere o hífen automaticamente após os três primeiros caracteres', async () => {
    renderPage();

    const input = screen.getByLabelText('Código de verificação');

    await userEvent.type(input, 'adk7yp');

    expect(input).toHaveValue('ADK-7YP');
  });

  it('confirma o e-mail e mostra o sucesso', async () => {
    renderPage();

    await userEvent.type(
      screen.getByLabelText('Código de verificação'),
      'ADK-7YP',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Confirmar e-mail/ }),
    );

    expect(verifyEmail).toHaveBeenCalledWith({ token: 'ADK-7YP' });
    expect(await screen.findByText('E-mail confirmado')).toBeInTheDocument();
  });

  it('mostra o erro de código inválido', async () => {
    verifyEmail.mockRejectedValue(
      new Error('Código inválido, expirado ou já utilizado.'),
    );

    renderPage();

    await userEvent.type(
      screen.getByLabelText('Código de verificação'),
      'XXX-XXX',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Confirmar e-mail/ }),
    );

    expect(
      await screen.findByText('Código inválido, expirado ou já utilizado.'),
    ).toBeInTheDocument();
  });

  it('mostra o e-mail e permite reenviar a verificação com cooldown', async () => {
    const { refreshProfile } = mockAuth(makeUser());

    renderPage();

    expect(screen.getByText('pessoa@example.com')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Reenviar e-mail de verificação' }),
    );

    expect(resendVerification).toHaveBeenCalledOnce();
    expect(
      await screen.findByText('Enviamos um novo e-mail de verificação.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reenviar em/ })).toBeDisabled();
    expect(refreshProfile).toHaveBeenCalledOnce();
  });

  it('permite sair da conta na tela de verificação', async () => {
    const { logout } = mockAuth(makeUser());

    renderPage();

    await userEvent.click(
      screen.getByRole('button', { name: /Sair e usar outra conta/ }),
    );

    expect(logout).toHaveBeenCalledOnce();
  });
});
