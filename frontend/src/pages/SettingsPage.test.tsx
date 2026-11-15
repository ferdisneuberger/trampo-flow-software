import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { personalAccessTokensService } from '../services/api/personal-access-tokens.service';
import type { PersonalAccessToken } from '../services/personal-access-tokens.types';
import { renderWithProviders } from '../test/render';
import { SettingsPage } from './SettingsPage';

vi.mock('../services/api/personal-access-tokens.service', () => ({
  personalAccessTokensService: {
    list: vi.fn(),
    create: vi.fn(),
    revoke: vi.fn(),
  },
}));

const service = vi.mocked(personalAccessTokensService);
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
    createdAt: '2026-11-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('SettingsPage — tokens de integração', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('avisa onde o token funciona hoje', async () => {
    service.list.mockResolvedValue([]);

    renderWithProviders(<SettingsPage />);

    const notice = await screen.findByRole('status', {
      name: '',
    });
    expect(notice).toHaveTextContent('Onde o token funciona hoje');
    expect(notice).toHaveTextContent('Claude Code');
    expect(notice).toHaveTextContent('Claude web e no celular ainda não');
  });

  it('mostra o estado vazio', async () => {
    service.list.mockResolvedValue([]);

    renderWithProviders(<SettingsPage />);

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

    renderWithProviders(<SettingsPage />);

    const submit = screen.getByRole('button', { name: 'Criar token' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Nome'), 'Claude Code');
    await user.selectOptions(screen.getByLabelText('Validade'), '30');
    await user.click(submit);

    expect(service.create).toHaveBeenCalledWith({
      name: 'Claude Code',
      expiresInDays: 30,
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

  it('mostra o erro da API ao criar', async () => {
    const user = userEvent.setup();
    service.list.mockResolvedValue([]);
    service.create.mockRejectedValue(new Error('Limite de 20 tokens ativos'));

    renderWithProviders(<SettingsPage />);

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

    renderWithProviders(<SettingsPage />);

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
