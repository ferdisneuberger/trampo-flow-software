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

    await userEvent.type(screen.getByLabelText('Nome'), 'Fernando');
    await userEvent.type(screen.getByLabelText('Último nome'), 'Neuberger');
    await userEvent.type(screen.getByLabelText('E-mail'), 'Pessoa@Exemplo.com');
    await userEvent.type(
      screen.getByLabelText('Senha'),
      'Senha-super-secreta1!',
    );
    await userEvent.type(
      screen.getByLabelText('Confirmar senha'),
      'Senha-super-secreta1!',
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: /termos de uso/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Criar conta/ }));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith({
        email: 'pessoa@exemplo.com',
        firstName: 'Fernando',
        lastName: 'Neuberger',
        password: 'Senha-super-secreta1!',
        termsAccepted: true,
      }),
    );
    expect(await screen.findByText('Cadastro recebido')).toBeInTheDocument();
  });

  it('exige nome e último nome', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /Criar conta/ }));

    expect(screen.getByText('Informe seu nome.')).toBeInTheDocument();
    expect(screen.getByText('Informe seu último nome.')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('mostra em tempo real se a senha atende aos requisitos', async () => {
    renderPage();

    const passwordInput = screen.getByLabelText('Senha');

    await userEvent.type(passwordInput, 'abcdefgh');

    expect(
      screen.getByRole('listitem', {
        name: /Pelo menos 8 caracteres: atendido/,
      }),
    ).toHaveAttribute('data-met', 'true');
    expect(
      screen.getByRole('listitem', {
        name: /Uma letra maiúscula: pendente/,
      }),
    ).toHaveAttribute('data-met', 'false');
    expect(
      screen.getByRole('listitem', { name: /Um número: pendente/ }),
    ).toHaveAttribute('data-met', 'false');
    expect(
      screen.getByRole('listitem', {
        name: /Um caractere especial: pendente/,
      }),
    ).toHaveAttribute('data-met', 'false');

    await userEvent.type(passwordInput, 'A1!');

    expect(
      screen.getByRole('listitem', {
        name: /Uma letra maiúscula: atendido/,
      }),
    ).toHaveAttribute('data-met', 'true');
    expect(
      screen.getByRole('listitem', { name: /Um número: atendido/ }),
    ).toHaveAttribute('data-met', 'true');
    expect(
      screen.getByRole('listitem', {
        name: /Um caractere especial: atendido/,
      }),
    ).toHaveAttribute('data-met', 'true');
  });

  it('permite revelar e ocultar a senha', async () => {
    renderPage();

    const passwordInput = screen.getByLabelText('Senha');

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

    const passwordInput = screen.getByLabelText('Senha');
    const confirmPasswordInput = screen.getByLabelText('Confirmar senha');

    await userEvent.type(passwordInput, 'Senha-super-secreta1!');
    await userEvent.type(confirmPasswordInput, 'Senha');

    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(confirmPasswordInput).toHaveAttribute('aria-invalid', 'true');
    expect(confirmPasswordInput).toHaveClass('border-coral');

    await userEvent.type(confirmPasswordInput, '-super-secreta1!');

    expect(
      screen.queryByText('As senhas não coincidem.'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('As senhas coincidem.')).toBeInTheDocument();
    expect(confirmPasswordInput).not.toHaveAttribute('aria-invalid');
    expect(confirmPasswordInput).toHaveClass('border-green');
  });

  it('bloqueia o envio quando faltam requisitos além do tamanho', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText('E-mail'), 'pessoa@exemplo.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'abcdefgh');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'abcdefgh');
    await userEvent.click(
      screen.getByRole('checkbox', { name: /termos de uso/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Criar conta/ }));

    expect(
      screen.getByText('A senha deve conter pelo menos uma letra maiúscula.'),
    ).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('valida senha curta, confirmação e termos', async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText('Nome'), 'Fernando');
    await userEvent.type(screen.getByLabelText('Último nome'), 'Neuberger');
    await userEvent.type(screen.getByLabelText('E-mail'), 'pessoa@exemplo.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'curta');
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'outra');
    await userEvent.click(screen.getByRole('button', { name: /Criar conta/ }));

    expect(
      screen.getByText('A senha deve ter pelo menos 8 caracteres.'),
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

    await userEvent.type(screen.getByLabelText('Nome'), 'Fernando');
    await userEvent.type(screen.getByLabelText('Último nome'), 'Neuberger');
    await userEvent.type(screen.getByLabelText('E-mail'), 'pessoa@exemplo.com');
    await userEvent.type(
      screen.getByLabelText('Senha'),
      'Senha-super-secreta1!',
    );
    await userEvent.type(
      screen.getByLabelText('Confirmar senha'),
      'Senha-super-secreta1!',
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
