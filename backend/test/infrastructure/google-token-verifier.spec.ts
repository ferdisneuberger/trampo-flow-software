import type { ConfigService } from '@nestjs/config';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GoogleTokenVerifier } from '../../src/infrastructure/auth/google-token-verifier';

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = mocks.verifyIdToken;
  },
}));

function createConfig(clientId: string | undefined): ConfigService {
  return {
    get: (key: string) => (key === 'GOOGLE_CLIENT_ID' ? clientId : undefined),
  } as unknown as ConfigService;
}

describe('GoogleTokenVerifier', () => {
  it('recusa quando o Client ID não está configurado', async () => {
    const verifier = new GoogleTokenVerifier(createConfig(undefined));

    await expect(verifier.verify('credential')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('devolve os dados do payload', async () => {
    mocks.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-user-1',
        email: 'pessoa@exemplo.com',
        email_verified: true,
      }),
    });
    const verifier = new GoogleTokenVerifier(createConfig('client-id'));

    await expect(verifier.verify('credential')).resolves.toEqual({
      googleId: 'google-user-1',
      email: 'pessoa@exemplo.com',
      emailVerified: true,
    });
    expect(mocks.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'credential',
      audience: 'client-id',
    });
  });

  it('devolve emailVerified falso sem inventar validação', async () => {
    mocks.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-user-1',
        email: 'pessoa@exemplo.com',
        email_verified: false,
      }),
    });
    const verifier = new GoogleTokenVerifier(createConfig('client-id'));

    await expect(verifier.verify('credential')).resolves.toMatchObject({
      emailVerified: false,
    });
  });

  it('recusa credencial inválida', async () => {
    mocks.verifyIdToken.mockRejectedValue(new Error('invalid'));
    const verifier = new GoogleTokenVerifier(createConfig('client-id'));

    await expect(verifier.verify('credential')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('recusa payload incompleto', async () => {
    mocks.verifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'google-user-1' }),
    });
    const verifier = new GoogleTokenVerifier(createConfig('client-id'));

    await expect(verifier.verify('credential')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
