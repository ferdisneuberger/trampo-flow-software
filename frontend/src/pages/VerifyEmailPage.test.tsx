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
  },
}));

const mockedUseAuth = vi.mocked(useAuth);
const verifyEmail = vi.mocked(authService.verifyEmail);

function renderPage(route = '/verificar-email') {
  renderWithProviders(<VerifyEmailPage />, { route });
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyEmail.mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });
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
});
