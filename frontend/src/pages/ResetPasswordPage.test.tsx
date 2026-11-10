import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../services/api/auth.service';
import { renderWithProviders } from '../test/render';
import { ResetPasswordPage } from './ResetPasswordPage';

vi.mock('../services/api/auth.service', () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

const resetPassword = vi.mocked(authService.resetPassword);

function renderPage() {
  renderWithProviders(<ResetPasswordPage />, { route: '/redefinir-senha' });
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPassword.mockResolvedValue(undefined);
    window.history.replaceState(null, '', '/redefinir-senha#token=reset-token');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('redefine a senha com o token do fragmento', async () => {
    renderPage();

    await userEvent.type(
      screen.getByLabelText('Nova senha'),
      'Senha-nova-segura1!',
    );
    await userEvent.type(
      screen.getByLabelText('Confirmar nova senha'),
      'Senha-nova-segura1!',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Redefinir senha/ }),
    );

    expect(resetPassword).toHaveBeenCalledWith({
      token: 'reset-token',
      password: 'Senha-nova-segura1!',
    });
    expect(await screen.findByText('Senha redefinida')).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe(''));
  });

  it('permite revelar e ocultar a nova senha', async () => {
    renderPage();

    const passwordInput = screen.getByLabelText('Nova senha');

    expect(passwordInput).toHaveAttribute('type', 'password');

    await userEvent.click(
      screen.getAllByRole('button', { name: 'Mostrar senha' })[0],
    );

    expect(passwordInput).toHaveAttribute('type', 'text');

    await userEvent.click(
      screen.getByRole('button', { name: 'Ocultar senha' }),
    );

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('valida a confirmação de senha em tempo real', async () => {
    renderPage();

    const passwordInput = screen.getByLabelText('Nova senha');
    const confirmPasswordInput = screen.getByLabelText('Confirmar nova senha');

    await userEvent.type(passwordInput, 'Senha-nova-segura1!');
    await userEvent.type(confirmPasswordInput, 'Senha');

    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(confirmPasswordInput).toHaveAttribute('aria-invalid', 'true');
    expect(confirmPasswordInput).toHaveClass('border-danger');

    await userEvent.type(confirmPasswordInput, '-nova-segura1!');

    expect(
      screen.queryByText('As senhas não coincidem.'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('As senhas coincidem.')).toBeInTheDocument();
    expect(confirmPasswordInput).not.toHaveAttribute('aria-invalid');
    expect(confirmPasswordInput).toHaveClass('border-success');
  });

  it('valida senha curta e confirmação', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText('Nova senha'), 'curta');
    await userEvent.type(
      screen.getByLabelText('Confirmar nova senha'),
      'outra',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Redefinir senha/ }),
    );

    expect(
      screen.getByText('A senha deve ter pelo menos 8 caracteres.'),
    ).toBeInTheDocument();
    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('mostra link inválido quando não há token', () => {
    window.history.replaceState(null, '', '/redefinir-senha');

    renderPage();

    expect(screen.getByText('Link inválido')).toBeInTheDocument();
  });

  it('mostra o erro devolvido pela API', async () => {
    resetPassword.mockRejectedValue(
      new Error('Link inválido, expirado ou já utilizado.'),
    );

    renderPage();

    await userEvent.type(
      screen.getByLabelText('Nova senha'),
      'Senha-nova-segura1!',
    );
    await userEvent.type(
      screen.getByLabelText('Confirmar nova senha'),
      'Senha-nova-segura1!',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Redefinir senha/ }),
    );

    expect(
      await screen.findByText('Link inválido, expirado ou já utilizado.'),
    ).toBeInTheDocument();
  });
});
