import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../contexts/auth-context';
import { ProtectedRoute } from './ProtectedRoute';

vi.mock('../../contexts/auth-context', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/candidaturas']}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/candidaturas" element={<p>quadro</p>} />
        </Route>
        <Route path="/login" element={<p>login</p>} />
        <Route path="/verificar-email" element={<p>verificacao</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra loading enquanto a sessão é restaurada', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      updateThemePreference: vi.fn(),
    });

    renderRoute();

    expect(screen.getByRole('status')).toHaveTextContent(
      /Carregando Trampo Flow/,
    );
  });

  it('redireciona para login quando não autenticado', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
      updateThemePreference: vi.fn(),
    });

    renderRoute();

    expect(screen.getByText('login')).toBeInTheDocument();
  });

  it('renderiza o conteúdo quando autenticado', () => {
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

    renderRoute();

    expect(screen.getByText('quadro')).toBeInTheDocument();
  });

  it('redireciona para verificação quando o e-mail não está confirmado', () => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'fernando@example.com',
        firstName: 'Fernando',
        lastName: 'Neuberger',
        emailVerified: false,
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

    renderRoute();

    expect(screen.getByText('verificacao')).toBeInTheDocument();
  });
});
