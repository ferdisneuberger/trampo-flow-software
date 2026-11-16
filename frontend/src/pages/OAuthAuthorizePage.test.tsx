import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api/errors';
import { oauthService } from '../services/api/oauth.service';
import type { AuthorizationPreview } from '../services/oauth.types';
import { renderWithProviders } from '../test/render';
import { OAuthAuthorizePage } from './OAuthAuthorizePage';

vi.mock('../services/api/oauth.service', () => ({
  oauthService: {
    isEnabled: vi.fn(),
    preview: vi.fn(),
    decide: vi.fn(),
    listGrants: vi.fn(),
    revokeGrant: vi.fn(),
  },
}));

const service = vi.mocked(oauthService);

const QUERY =
  '?response_type=code&client_id=tfc_abc&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback&code_challenge=abc&code_challenge_method=S256&state=xyz';

function makePreview(
  overrides: Partial<AuthorizationPreview['client']> = {},
): AuthorizationPreview {
  return {
    client: {
      name: 'Claude',
      verified: true,
      redirectHost: 'claude.ai',
      ...overrides,
    },
    scopes: [
      { id: 'applications:read', label: 'Ver suas candidaturas' },
      {
        id: 'applications:write',
        label: 'Criar, atualizar e mover candidaturas',
      },
    ],
    cannotDo: ['apagar candidaturas'],
  };
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/oauth/authorize" element={<OAuthAuthorizePage />} />
    </Routes>,
    { route: `/oauth/authorize${QUERY}` },
  );
}

const assign = vi.fn();
const originalLocation = window.location;

describe('OAuthAuthorizePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('mostra quem pede acesso, o destino, o que pode e o que não pode', async () => {
    service.preview.mockResolvedValue(makePreview());

    renderPage();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /Claude\s+quer acessar sua conta no Trampo Flow/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Aplicativo verificado (Claude)')).toBeVisible();
    expect(screen.getByTestId('redirect-host')).toHaveTextContent('claude.ai');
    expect(screen.getByText('Ver suas candidaturas')).toBeVisible();
    expect(
      screen.getByText('Criar, atualizar e mover candidaturas'),
    ).toBeVisible();
    expect(screen.getByText('Apagar candidaturas')).toBeVisible();
    expect(service.preview).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'tfc_abc',
        code_challenge_method: 'S256',
        state: 'xyz',
      }),
    );
  });

  it('cliente não verificado mostra aviso e o host de destino em destaque', async () => {
    service.preview.mockResolvedValue(
      makePreview({
        name: 'Outro App',
        verified: false,
        redirectHost: 'localhost:6274',
      }),
    );

    renderPage();

    expect(await screen.findByText('Aplicativo não verificado')).toBeVisible();
    expect(
      screen.getByText('Confira o destino antes de autorizar'),
    ).toBeVisible();
    expect(screen.getByTestId('redirect-host')).toHaveTextContent(
      'localhost:6274',
    );
  });

  it('autorizar aprova e segue o redirectTo devolvido pelo servidor', async () => {
    const user = userEvent.setup();
    service.preview.mockResolvedValue(makePreview());
    service.decide.mockResolvedValue({
      redirectTo: 'https://claude.ai/api/mcp/auth_callback?code=c1&state=xyz',
    });

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Autorizar' }));

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        'https://claude.ai/api/mcp/auth_callback?code=c1&state=xyz',
      ),
    );
    expect(service.decide).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'tfc_abc' }),
      true,
    );
  });

  it('cancelar nega e segue o redirectTo de access_denied', async () => {
    const user = userEvent.setup();
    service.preview.mockResolvedValue(makePreview());
    service.decide.mockResolvedValue({
      redirectTo:
        'https://claude.ai/api/mcp/auth_callback?error=access_denied&state=xyz',
    });

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        'https://claude.ai/api/mcp/auth_callback?error=access_denied&state=xyz',
      ),
    );
    expect(service.decide).toHaveBeenCalledWith(expect.anything(), false);
  });

  it('pedido inválido mostra o motivo, sem botões e sem redirecionar', async () => {
    service.preview.mockRejectedValue(
      new ApiError(
        'redirect_uri não consta entre os endereços do aplicativo.',
        400,
        'invalid_request',
      ),
    );

    renderPage();

    expect(await screen.findByText('Não foi possível autorizar')).toBeVisible();
    expect(
      screen.getByText(/redirect_uri não consta entre os endereços/),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Autorizar' }),
    ).not.toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it('erro ao decidir mostra a mensagem e não redireciona', async () => {
    const user = userEvent.setup();
    service.preview.mockResolvedValue(makePreview());
    service.decide.mockRejectedValue(new ApiError('Muitas tentativas.', 429));

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Autorizar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Muitas tentativas.',
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>1</script>',
    'myapp://callback?code=x',
  ])('recusa seguir um redirectTo inseguro (%s)', async (redirectTo) => {
    const user = userEvent.setup();
    service.preview.mockResolvedValue(makePreview());
    service.decide.mockResolvedValue({ redirectTo });

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Autorizar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('não é seguro');
    expect(assign).not.toHaveBeenCalled();
  });
});
