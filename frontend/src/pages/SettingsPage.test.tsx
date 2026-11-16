import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/render';
import { SettingsPage } from './SettingsPage';

function renderSettings() {
  return renderWithProviders(
    <Routes>
      <Route path="/configuracoes" element={<SettingsPage />} />
      <Route path="/configuracoes/mcp" element={<p>tela do MCP</p>} />
    </Routes>,
    { route: '/configuracoes' },
  );
}

describe('SettingsPage (início de Configurações)', () => {
  it('mostra o título e um cartão por seção, com o MCP', () => {
    renderSettings();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Configurações' }),
    ).toBeInTheDocument();

    const list = screen.getByRole('list', { name: 'Seções de configurações' });
    const link = screen.getByRole('link', { name: /MCP/ });

    expect(list).toContainElement(link);
    expect(link).toHaveAttribute('href', '/configuracoes/mcp');
  });

  it('o cartão do MCP leva à tela do MCP', async () => {
    const user = userEvent.setup();

    renderSettings();
    await user.click(screen.getByRole('link', { name: /MCP/ }));

    expect(screen.getByText('tela do MCP')).toBeInTheDocument();
  });
});
