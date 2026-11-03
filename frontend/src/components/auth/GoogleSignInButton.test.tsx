import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../contexts/auth-context';
import { ApiError } from '../../services/api/errors';
import type { GoogleCredentialResponse } from '../../services/google/google-identity';
import { renderWithProviders } from '../../test/render';
import { GoogleSignInButton } from './GoogleSignInButton';

const mocks = vi.hoisted(() => ({
  googleClientId: '',
  loadGoogleIdentity: vi.fn(),
}));

vi.mock('../../config/env', () => ({
  env: {
    get googleClientId() {
      return mocks.googleClientId;
    },
  },
}));

vi.mock('../../services/google/google-identity', () => ({
  loadGoogleIdentity: mocks.loadGoogleIdentity,
}));

vi.mock('../../contexts/auth-context', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const loginWithGoogle = vi.fn();

function makeGoogleApi() {
  let credentialCallback:
    ((response: GoogleCredentialResponse) => void) | null = null;
  const initialize = vi.fn(
    (config: { callback: (response: GoogleCredentialResponse) => void }) => {
      credentialCallback = config.callback;
    },
  );
  const renderButton = vi.fn();
  const api = {
    accounts: {
      id: {
        initialize,
        renderButton,
        disableAutoSelect: vi.fn(),
        cancel: vi.fn(),
      },
    },
  };

  return {
    api,
    initialize,
    renderButton,
    emitCredential: (credential: string) =>
      credentialCallback?.({ credential }),
  };
}

function renderButtonComponent() {
  renderWithProviders(<GoogleSignInButton />, { route: '/login' });
}

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.googleClientId = '';
    mocks.loadGoogleIdentity.mockReset();
    loginWithGoogle.mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      loginWithGoogle,
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });
  });

  it('não renderiza nada sem Client ID', () => {
    const { container } = renderWithProviders(<GoogleSignInButton />);

    expect(container).toBeEmptyDOMElement();
    expect(mocks.loadGoogleIdentity).not.toHaveBeenCalled();
  });

  it('carrega o script e renderiza o botão quando configurado', async () => {
    const google = makeGoogleApi();
    mocks.googleClientId = 'client-id';
    mocks.loadGoogleIdentity.mockResolvedValue(google.api);

    renderButtonComponent();

    await waitFor(() => expect(google.initialize).toHaveBeenCalled());
    expect(google.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'client-id' }),
    );
    expect(google.renderButton).toHaveBeenCalled();
  });

  it('envia a credencial ao autenticar', async () => {
    const google = makeGoogleApi();
    mocks.googleClientId = 'client-id';
    mocks.loadGoogleIdentity.mockResolvedValue(google.api);

    renderButtonComponent();
    await waitFor(() => expect(google.initialize).toHaveBeenCalled());

    google.emitCredential('google-credential');

    await waitFor(() =>
      expect(loginWithGoogle).toHaveBeenCalledWith({
        credential: 'google-credential',
        termsAccepted: false,
      }),
    );
  });

  it('pede aceite dos termos para conta nova e tenta de novo', async () => {
    const google = makeGoogleApi();
    mocks.googleClientId = 'client-id';
    mocks.loadGoogleIdentity.mockResolvedValue(google.api);
    loginWithGoogle.mockRejectedValueOnce(
      new ApiError('Aceite os termos.', 403, 'TERMS_REQUIRED'),
    );

    renderButtonComponent();
    await waitFor(() => expect(google.initialize).toHaveBeenCalled());

    google.emitCredential('google-credential');

    expect(
      await screen.findByText('Falta aceitar os termos para criar sua conta.'),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('checkbox', { name: /termos de uso/ }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Continuar com Google/ }),
    );

    await waitFor(() =>
      expect(loginWithGoogle).toHaveBeenLastCalledWith({
        credential: 'google-credential',
        termsAccepted: true,
      }),
    );
  });

  it('mostra o erro quando o login falha', async () => {
    const google = makeGoogleApi();
    mocks.googleClientId = 'client-id';
    mocks.loadGoogleIdentity.mockResolvedValue(google.api);
    loginWithGoogle.mockRejectedValue(
      new ApiError('Credencial inválida.', 401, 'INVALID_GOOGLE_TOKEN'),
    );

    renderButtonComponent();
    await waitFor(() => expect(google.initialize).toHaveBeenCalled());

    google.emitCredential('google-credential');

    expect(await screen.findByText('Credencial inválida.')).toBeInTheDocument();
  });
});
