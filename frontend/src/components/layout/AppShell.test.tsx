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
    logout,
    refreshProfile: vi.fn(),
    updateThemePreference: vi.fn(),
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

  it('mostra header, busca e link de pular conteúdo', () => {
    renderShell();

    expect(
      screen.getByRole('link', { name: 'Pular para o conteúdo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Trampo Flow' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Abrir busca' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Tema:/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Menu da conta de Fernando/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('conteúdo do quadro')).toBeInTheDocument();
  });

  it('abre o menu da conta e encerra a sessão', async () => {
    renderShell();

    await userEvent.click(
      screen.getByRole('button', { name: /Menu da conta de Fernando/ }),
    );

    expect(screen.getByText('Fernando')).toBeInTheDocument();
    expect(screen.getByText('fernando@example.com')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('menuitem', { name: 'Sair' }));

    expect(logout).toHaveBeenCalledOnce();
  });
});
