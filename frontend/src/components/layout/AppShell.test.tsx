import { screen, within } from '@testing-library/react';
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
        <Route path="/configuracoes" element={<p>página de configurações</p>} />
        <Route path="/configuracoes/mcp" element={<p>tela do MCP</p>} />
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

  it('abre Configurações pelo menu da conta', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(
      screen.getByRole('button', { name: /Menu da conta de Fernando/ }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Configurações' }));

    expect(
      await screen.findByText('página de configurações'),
    ).toBeInTheDocument();
  });

  it('mostra o MCP como subitem de Configurações no menu da conta (celular)', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(
      screen.getByRole('button', { name: /Menu da conta de Fernando/ }),
    );

    const items = screen
      .getAllByRole('menuitem')
      .map((item) => item.textContent);

    // O MCP vem logo depois de Configurações e antes de Sair.
    expect(items).toEqual(['Configurações', 'MCP', 'Sair']);

    await user.click(screen.getByRole('menuitem', { name: 'MCP' }));

    expect(await screen.findByText('tela do MCP')).toBeInTheDocument();
  });

  it('na barra lateral o MCP é um subitem de Configurações, visível com o menu expandido', async () => {
    const user = userEvent.setup();
    renderShell();

    const nav = screen.getByRole('navigation', { name: 'Principal' });

    // A barra começa recolhida: só os ícones principais.
    expect(within(nav).queryByRole('link', { name: 'MCP' })).toBeNull();

    await user.click(
      screen.getByRole('button', { name: 'Expandir menu lateral' }),
    );

    const mcp = within(nav).getByRole('link', { name: 'MCP' });

    expect(mcp).toHaveAttribute('href', '/configuracoes/mcp');

    await user.click(mcp);

    expect(await screen.findByText('tela do MCP')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'MCP' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // Configurações só fica ativo na própria página, não na do subitem.
    expect(
      within(nav).getByRole('link', { name: 'Configurações' }),
    ).not.toHaveAttribute('aria-current');
  });
});
