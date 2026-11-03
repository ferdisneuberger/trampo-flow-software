import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../services/api/auth.service';
import { renderWithProviders } from '../test/render';
import { RegisterPage } from './RegisterPage';

vi.mock('../services/api/auth.service', () => ({
  authService: {
    register: vi.fn(),
  },
}));

const register = vi.mocked(authService.register);

function renderPage() {
  renderWithProviders(
    <Routes>
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="/login" element={<p>login</p>} />
      <Route path="/termos" element={<p>termos</p>} />
      <Route path="/verificar-email" element={<p>verificar</p>} />
    </Routes>,
    { route: '/cadastro' },
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    register.mockResolvedValue({ message: 'ok' });
  });

  it('envia o cadastro com e-mail normalizado e termos aceitos', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText('E-mail'), 'Pessoa@Exemplo.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-super-secreta');
    await userEvent.type(
      screen.getByLabelText('Confirmar senha'),
      'senha-super-secreta',
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: /termos de uso/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Criar conta/ }));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        email: 'pessoa@exemplo.com',
        password: 'senha-super-secreta',
        termsAccepted: true,
      }),
    );
    expect(await screen.findByText('Cadastro recebido')).toBeInTheDocument();
  });

  it('valida senha curta, confirmação e termos', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText('E-mail'), 'pessoa@exemplo.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'curta');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'outra');
    await userEvent.click(screen.getByRole('button', { name: /Criar conta/ }));

    expect(
      screen.getByText('A senha deve ter pelo menos 12 caracteres.'),
    ).toBeInTheDocument();
    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(
      screen.getByText('É necessário aceitar os termos de uso.'),
    ).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('mostra o erro devolvido pela API', async () => {
    register.mockRejectedValue(new Error('E-mail já cadastrado.'));

    renderPage();

    await userEvent.type(screen.getByLabelText('E-mail'), 'pessoa@exemplo.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-super-secreta');
    await userEvent.type(
      screen.getByLabelText('Confirmar senha'),
      'senha-super-secreta',
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: /termos de uso/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Criar conta/ }));

    expect(
      await screen.findByText('E-mail já cadastrado.'),
    ).toBeInTheDocument();
  });
});
