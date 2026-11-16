import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { oauthService } from '../services/api/oauth.service';
import { personalAccessTokensService } from '../services/api/personal-access-tokens.service';
import type { PersonalAccessToken } from '../services/personal-access-tokens.types';
import { renderWithProviders } from '../test/render';
import { McpSettingsPage } from './McpSettingsPage';

vi.mock('../services/api/personal-access-tokens.service', () => ({
  personalAccessTokensService: {
    list: vi.fn(),
    create: vi.fn(),
    revoke: vi.fn(),
  },
}));

vi.mock('../services/api/oauth.service', () => ({
  oauthService: {
    isEnabled: vi.fn(),
    listGrants: vi.fn(),
    revokeGrant: vi.fn(),
  },
}));

const service = vi.mocked(personalAccessTokensService);
const oauth = vi.mocked(oauthService);
const FUTURE = '2099-01-01T00:00:00.000Z';

function makeToken(
  overrides: Partial<PersonalAccessToken> = {},
): PersonalAccessToken {
  return {
    id: 't1',
    name: 'Claude Code',
    prefix: 'tfp_abcd',
    lastUsedAt: null,
    expiresAt: FUTURE,
    revokedAt: null,
    scope: 'applications:read applications:write',
    createdAt: '2026-11-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('McpSettingsPage — tokens de integração', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    oauth.isEnabled.mockResolvedValue(false);
    oauth.listGrants.mockResolvedValue([]);
  });

  it('com o OAuth desligado, avisa onde o token funciona hoje', async () => {
    service.list.mockResolvedValue([]);

    renderWithProviders(<McpSettingsPage />);

    const notice = await screen.findByText('Onde o token funciona hoje');
    expect(notice).toBeVisible();
    expect(
      screen.getByText(/No Claude web e no celular ainda não/),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Aplicativos conectados' }),
    ).not.toBeInTheDocument();
  });

  it('com o OAuth ligado, tira o aviso de "ainda não" e mostra os aplicativos conectados', async () => {
    oauth.isEnabled.mockResolvedValue(true);
    oauth.listGrants.mockResolvedValue([]);
    service.list.mockResolvedValue([]);

    renderWithProviders(<McpSettingsPage />);

    expect(
      await screen.findByRole('heading', { name: 'Aplicativos conectados' }),
    ).toBeVisible();
    expect(
      screen.queryByText('Onde o token funciona hoje'),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText('Nenhum aplicativo conectado.'),
    ).toBeVisible();
    expect(screen.getByText(/Autorizar/)).toBeVisible();
  });

  it('o painel "Como conectar" troca de aba e traz os comandos com a URL do MCP', async () => {
    const user = userEvent.setup();
    service.list.mockResolvedValue([]);

    renderWithProviders(<McpSettingsPage />);

    expect(
      await screen.findByRole('tab', { name: 'Claude web e celular' }),
    ).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Claude Code' }));

    expect(screen.getByRole('tab', { name: 'Claude Code' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      `claude mcp add --transport http trampo-flow ${window.location.origin}/mcp`,
    );

    await user.click(screen.getByRole('tab', { name: 'Automação' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Somente leitura');
    expect(screen.getByRole('link', { name: 'aqui' })).toHaveAttribute(
      'href',
      expect.stringContaining('guia-conexao-mcp.md'),
    );
  });

  it('lista os aplicativos conectados e revoga com confirmação', async () => {
    const user = userEvent.setup();
    oauth.isEnabled.mockResolvedValue(true);
    oauth.listGrants
      .mockResolvedValueOnce([
        {
          id: 'g1',
          clientName: 'Claude',
          scopes: ['applications:read', 'applications:write'],
          createdAt: '2026-11-15T12:00:00.000Z',
          lastUsedAt: null,
        },
      ])
      .mockResolvedValue([]);
    oauth.revokeGrant.mockResolvedValue();
    service.list.mockResolvedValue([]);

    renderWithProviders(<McpSettingsPage />);

    const list = await screen.findByRole('list', {
      name: 'Aplicativos conectados',
    });
    expect(within(list).getByText('Claude')).toBeVisible();
    expect(
      within(list).getByText(/Criar, atualizar e mover candidaturas/),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Revogar Claude' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Revogar' }));

    await waitFor(() => expect(oauth.revokeGrant).toHaveBeenCalledWith('g1'));
    expect(
      await screen.findByText('Nenhum aplicativo conectado.'),
    ).toBeVisible();
  });

  it('mostra o estado vazio', async () => {
    service.list.mockResolvedValue([]);

    renderWithProviders(<McpSettingsPage />);

    expect(
      await screen.findByText('Nenhum token criado ainda.'),
    ).toBeInTheDocument();
  });

  it('cria um token e mostra o segredo uma única vez', async () => {
    const user = userEvent.setup();
    service.list.mockResolvedValue([]);
    service.create.mockResolvedValue({
      ...makeToken(),
      token: 'tfp_segredo_completo',
    });

    renderWithProviders(<McpSettingsPage />);

    const submit = screen.getByRole('button', { name: 'Criar token' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Nome'), 'Claude Code');
    await user.selectOptions(screen.getByLabelText('Validade'), '30');
    await user.click(submit);

    expect(service.create).toHaveBeenCalledWith({
      name: 'Claude Code',
      expiresInDays: 30,
      scope: 'applications:read applications:write',
    });
    expect(await screen.findByTestId('created-token')).toHaveTextContent(
      'tfp_segredo_completo',
    );
    expect(
      screen.getByText(/claude mcp add --transport http trampo-flow/),
    ).toHaveTextContent(`${window.location.origin}/mcp`);

    await user.click(screen.getByRole('button', { name: 'Já copiei' }));

    expect(screen.queryByTestId('created-token')).not.toBeInTheDocument();
  });

  it('cria um token somente leitura e mostra a permissão na lista', async () => {
    const user = userEvent.setup();
    service.list.mockResolvedValue([
      makeToken({ id: 't9', name: 'Relatório', scope: 'applications:read' }),
    ]);
    service.create.mockResolvedValue({
      ...makeToken({ scope: 'applications:read' }),
      token: 'tfp_so_leitura',
    });

    renderWithProviders(<McpSettingsPage />);

    const list = await screen.findByRole('list', {
      name: 'Tokens de integração',
    });
    expect(within(list).getByText(/Somente leitura/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nome'), 'Relatório');
    await user.selectOptions(
      screen.getByLabelText('Permissões'),
      'applications:read',
    );
    await user.click(screen.getByRole('button', { name: 'Criar token' }));

    expect(service.create).toHaveBeenCalledWith({
      name: 'Relatório',
      expiresInDays: 90,
      scope: 'applications:read',
    });
  });

  it('mostra o erro da API ao criar', async () => {
    const user = userEvent.setup();
    service.list.mockResolvedValue([]);
    service.create.mockRejectedValue(new Error('Limite de 20 tokens ativos'));

    renderWithProviders(<McpSettingsPage />);

    await user.type(screen.getByLabelText('Nome'), 'x');
    await user.click(screen.getByRole('button', { name: 'Criar token' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Limite');
  });

  it('lista tokens com estado e revoga após confirmar', async () => {
    const user = userEvent.setup();
    service.list.mockResolvedValue([
      makeToken(),
      makeToken({
        id: 't2',
        name: 'Antigo',
        revokedAt: '2026-11-10T00:00:00.000Z',
      }),
      makeToken({
        id: 't3',
        name: 'Vencido',
        expiresAt: '2020-01-01T00:00:00.000Z',
      }),
    ]);
    service.revoke.mockResolvedValue();

    renderWithProviders(<McpSettingsPage />);

    const list = await screen.findByRole('list', {
      name: 'Tokens de integração',
    });
    expect(within(list).getByText('Ativo')).toBeInTheDocument();
    expect(within(list).getByText('Revogado')).toBeInTheDocument();
    expect(within(list).getByText('Expirado')).toBeInTheDocument();
    expect(
      within(list).getAllByRole('button', { name: /Revogar token/ }),
    ).toHaveLength(1);

    await user.click(
      screen.getByRole('button', { name: 'Revogar token Claude Code' }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Revogar' }));

    await waitFor(() => expect(service.revoke).toHaveBeenCalledWith('t1'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
});
