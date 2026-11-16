import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navigate, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/render';
import { SettingsPage } from './SettingsPage';

function renderSettings(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/configuracoes" element={<SettingsPage />}>
        <Route index element={<Navigate to="mcp" replace />} />
        <Route path="mcp" element={<p>conteúdo do MCP</p>} />
      </Route>
    </Routes>,
    { route },
  );
}

describe('SettingsPage (layout com submenu)', () => {
  it('mostra o título e o submenu com a seção MCP', () => {
    renderSettings('/configuracoes/mcp');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Configurações' }),
    ).toBeInTheDocument();

    const nav = screen.getByRole('navigation', {
      name: 'Seções de configurações',
    });

    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'MCP' })).toHaveAttribute(
      'href',
      '/configuracoes/mcp',
    );
  });

  it('renderiza o conteúdo da seção e marca o item ativo', () => {
    renderSettings('/configuracoes/mcp');

    expect(screen.getByText('conteúdo do MCP')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'MCP' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('/configuracoes redireciona para a primeira seção (MCP)', () => {
    renderSettings('/configuracoes');

    expect(screen.getByText('conteúdo do MCP')).toBeInTheDocument();
  });

  it('o link do submenu leva à seção', async () => {
    const user = userEvent.setup();

    renderSettings('/configuracoes/mcp');
    await user.click(screen.getByRole('link', { name: 'MCP' }));

    expect(screen.getByText('conteúdo do MCP')).toBeInTheDocument();
  });
});
