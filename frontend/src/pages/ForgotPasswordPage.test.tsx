import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../services/api/auth.service';
import { renderWithProviders } from '../test/render';
import { ForgotPasswordPage } from './ForgotPasswordPage';

vi.mock('../services/api/auth.service', () => ({
  authService: {
    forgotPassword: vi.fn(),
  },
}));

const forgotPassword = vi.mocked(authService.forgotPassword);

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    forgotPassword.mockResolvedValue(undefined);
  });

  it('solicita o link e mostra a resposta genérica', async () => {
    renderWithProviders(<ForgotPasswordPage />, { route: '/esqueci-senha' });

    await userEvent.type(screen.getByLabelText('E-mail'), 'Pessoa@Exemplo.com');
    await userEvent.click(screen.getByRole('button', { name: /Enviar link/ }));

    expect(forgotPassword).toHaveBeenCalledWith({
      email: 'pessoa@exemplo.com',
    });
    expect(await screen.findByText('Verifique seu e-mail')).toBeInTheDocument();
  });

  it('mostra erro quando a solicitação falha', async () => {
    forgotPassword.mockRejectedValue(new Error('Muitas tentativas.'));

    renderWithProviders(<ForgotPasswordPage />, { route: '/esqueci-senha' });

    await userEvent.type(screen.getByLabelText('E-mail'), 'pessoa@exemplo.com');
    await userEvent.click(screen.getByRole('button', { name: /Enviar link/ }));

    expect(await screen.findByText('Muitas tentativas.')).toBeInTheDocument();
  });
});
