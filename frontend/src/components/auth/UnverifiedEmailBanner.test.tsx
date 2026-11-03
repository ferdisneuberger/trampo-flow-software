import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../contexts/auth-context';
import { authService } from '../../services/api/auth.service';
import { UnverifiedEmailBanner } from './UnverifiedEmailBanner';

vi.mock('../../contexts/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../services/api/auth.service', () => ({
  authService: {
    resendVerification: vi.fn(),
  },
}));

const mockedUseAuth = vi.mocked(useAuth);
const resendVerification = vi.mocked(authService.resendVerification);
const refreshProfile = vi.fn();

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'pessoa@example.com',
    emailVerified: false,
    hasPassword: true,
    termsAccepted: true,
    verificationResendAvailableAt: null,
    ...overrides,
  };
}

function mockAuth(user: ReturnType<typeof makeUser>) {
  mockedUseAuth.mockReturnValue({
    user,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshProfile,
  });
}

describe('UnverifiedEmailBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resendVerification.mockResolvedValue({
      sent: true,
      retryAfterSeconds: 120,
    });
  });

  it('não aparece para usuário verificado', () => {
    mockAuth(makeUser({ emailVerified: true }));

    const { container } = render(<UnverifiedEmailBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('mostra o aviso e reenvia o código', async () => {
    mockAuth(makeUser());

    render(<UnverifiedEmailBanner />);

    expect(
      screen.getByText('Confirme seu e-mail para criar candidaturas'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sua conta não será excluída/)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Reenviar e-mail' }),
    );

    expect(resendVerification).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(
        screen.getByText('Enviamos um novo código para o seu e-mail.'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Reenviar em/ })).toBeDisabled();
    expect(refreshProfile).toHaveBeenCalledOnce();
  });

  it('mostra o erro quando o reenvio falha', async () => {
    mockAuth(makeUser());
    resendVerification.mockRejectedValue(new Error('Muitas tentativas.'));

    render(<UnverifiedEmailBanner />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Reenviar e-mail' }),
    );

    expect(await screen.findByText('Muitas tentativas.')).toBeInTheDocument();
  });

  it('mantém o contador quando o servidor informa cooldown', () => {
    mockAuth(
      makeUser({
        verificationResendAvailableAt: new Date(
          Date.now() + 120_000,
        ).toISOString(),
      }),
    );

    render(<UnverifiedEmailBanner />);

    expect(
      screen.getByRole('button', { name: /Reenviar em 0[12]:\d{2}/ }),
    ).toBeDisabled();
  });
});
