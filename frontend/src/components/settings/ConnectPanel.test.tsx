import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AGENT_DOCS, AGENT_TABS } from './connect-agents';
import { ConnectPanel } from './ConnectPanel';

const MCP_URL = `${window.location.origin}/mcp`;

async function openTab(name: string) {
  const user = userEvent.setup();

  await user.click(screen.getByRole('tab', { name }));

  return screen.getByRole('tabpanel');
}

describe('ConnectPanel (um agente por aba)', () => {
  it('lista os agentes na ordem esperada', () => {
    render(<ConnectPanel oauthEnabled />);

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Claude',
      'Claude Code',
      'Cursor',
      'VS Code',
      'OpenCode',
      'Outros',
      'Automação',
    ]);
  });

  it('cada aba de agente tem o link da documentação oficial, em nova aba', async () => {
    render(<ConnectPanel oauthEnabled />);

    const expected: Record<string, string> = {
      Claude: 'https://support.claude.com/',
      'Claude Code': 'https://code.claude.com/docs/en/mcp',
      Cursor: 'https://cursor.com/docs/mcp',
      'VS Code': 'https://code.visualstudio.com/docs/',
      OpenCode: 'https://opencode.ai/docs/mcp-servers/',
      Outros: 'https://modelcontextprotocol.io/',
    };

    for (const [tab, href] of Object.entries(expected)) {
      const panel = await openTab(tab);
      const link = panel.querySelector<HTMLAnchorElement>(
        'a[href^="https://"]',
      );

      expect(link, tab).not.toBeNull();
      expect(link?.href, tab).toContain(href);
      expect(link?.target).toBe('_blank');
      expect(link?.rel).toContain('noreferrer');
      expect(panel).toHaveTextContent('Documentação:');
    }
  });

  it('a lista de documentação cobre todas as abas, menos a automação', () => {
    for (const { id } of AGENT_TABS) {
      if (id === 'automation') {
        expect(AGENT_DOCS[id]).toBeNull();
      } else {
        expect(AGENT_DOCS[id]?.href).toMatch(/^https:\/\//);
      }
    }
  });

  it('Claude: com OAuth explica o conector personalizado; sem OAuth manda usar token', async () => {
    const { unmount } = render(<ConnectPanel oauthEnabled />);

    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Add custom connector',
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent(MCP_URL);
    unmount();

    render(<ConnectPanel oauthEnabled={false} />);

    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'ainda não está ligado',
    );
  });

  it('Cursor: JSON com url e header por variável de ambiente', async () => {
    render(<ConnectPanel oauthEnabled={false} />);

    const panel = await openTab('Cursor');

    expect(panel).toHaveTextContent('"mcpServers"');
    expect(panel).toHaveTextContent(`"url": "${MCP_URL}"`);
    expect(panel).toHaveTextContent('Bearer ${env:TRAMPO_API_TOKEN}');
    // O token nunca vai literal no exemplo.
    expect(panel).not.toHaveTextContent('tfp_');
  });

  it('VS Code: servers com pedido do token por input', async () => {
    render(<ConnectPanel oauthEnabled={false} />);

    const panel = await openTab('VS Code');

    expect(panel).toHaveTextContent('.vscode/mcp.json');
    expect(panel).toHaveTextContent('"servers"');
    expect(panel).toHaveTextContent('Bearer ${input:trampo-token}');
  });

  it('OpenCode: com OAuth mostra add + auth; sempre mostra o JSON com token', async () => {
    const { unmount } = render(<ConnectPanel oauthEnabled />);
    let panel = await openTab('OpenCode');

    expect(panel).toHaveTextContent(
      `opencode mcp add trampo-flow --url ${MCP_URL}`,
    );
    expect(panel).toHaveTextContent('opencode mcp auth trampo-flow');
    expect(panel).toHaveTextContent('"oauth": false');
    expect(panel).toHaveTextContent('Bearer {env:TRAMPO_API_TOKEN}');
    unmount();

    render(<ConnectPanel oauthEnabled={false} />);
    panel = await openTab('OpenCode');

    expect(panel).not.toHaveTextContent('opencode mcp auth');
    expect(panel).toHaveTextContent('"oauth": false');
  });

  it('avisa que as instruções vêm da documentação e não foram testadas em tudo', () => {
    render(<ConnectPanel oauthEnabled />);

    expect(
      screen.getByText(/não testadas em todos os aplicativos/),
    ).toBeInTheDocument();
  });
});
