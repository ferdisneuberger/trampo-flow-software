import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../contexts/auth-context';
import { renderWithProviders } from '../../test/render';
import { AppShell } from './AppShell';

vi.mock('../../contexts/auth-context', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const logout = vi.fn().mockResolvedValue(undefined);

function renderShell() {
  mockedUseAuth.mockReturnValue({
    user: {
      id: 'user-1',
      email: 'fernando@example.com',
      emailVerified: true,
      hasPassword: true,
      termsAccepted: true,
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout,
  });

  return renderWithProviders(
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/candidaturas" element={<p>conteúdo do quadro</p>} />
        <Route path="/login" element={<p>login</p>} />
      </Route>
    </Routes>,
    { route: '/candidaturas' },
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra navegação, usuário e link de pular conteúdo', () => {
    renderShell();

    expect(
      screen.getByRole('link', { name: 'Pular para o conteúdo' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Candidaturas' }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('fernando@example.com')).toBeInTheDocument();
    expect(screen.getByText('conteúdo do quadro')).toBeInTheDocument();
  });

  it('encerra a sessão pelo botão do menu', async () => {
    renderShell();

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(logout).toHaveBeenCalledOnce();
  });
});
