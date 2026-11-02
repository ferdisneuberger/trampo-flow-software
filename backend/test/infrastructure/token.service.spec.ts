import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenService } from '../../src/infrastructure/auth/token.service';

const JWT_SECRET = 'a'.repeat(64);

function createConfig(
  values: Record<string, string | undefined>,
): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('TokenService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('assina e verifica um token HS256', () => {
    const service = new TokenService(
      createConfig({ JWT_SECRET, JWT_EXPIRES_IN: '1h' }),
    );
    const signed = service.sign('fernando');
    const payload = service.verify(signed.token);

    expect(payload.sub).toBe('fernando');
    expect(payload.iat).toBe(Math.floor(Date.now() / 1000));
    expect(payload.exp).toBe(payload.iat + 3600);
    expect(service.expiresInSeconds).toBe(3600);
  });

  it('rejeita token com assinatura adulterada', () => {
    const service = new TokenService(
      createConfig({ JWT_SECRET, JWT_EXPIRES_IN: '1h' }),
    );
    const { token } = service.sign('fernando');
    const [header, payload, signature] = token.split('.');
    const signatureBytes = Buffer.from(signature, 'base64url');

    signatureBytes[0] ^= 0xff;

    const tampered = `${header}.${payload}.${signatureBytes.toString('base64url')}`;

    expect(() => service.verify(tampered)).toThrow();
  });

  it('rejeita token com payload adulterado', () => {
    const service = new TokenService(
      createConfig({ JWT_SECRET, JWT_EXPIRES_IN: '1h' }),
    );
    const { token } = service.sign('fernando');
    const [header, payload, signature] = token.split('.');
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;

    decoded.sub = 'outra-pessoa';

    const tamperedPayload = Buffer.from(
      JSON.stringify(decoded),
      'utf8',
    ).toString('base64url');

    expect(() =>
      service.verify(`${header}.${tamperedPayload}.${signature}`),
    ).toThrow();
  });

  it('rejeita token expirado com código TOKEN_EXPIRED', () => {
    const service = new TokenService(
      createConfig({ JWT_SECRET, JWT_EXPIRES_IN: '1s' }),
    );
    const { token } = service.sign('fernando');

    vi.advanceTimersByTime(7000);

    try {
      service.verify(token);
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    throw new Error('Token expirado deveria ter sido rejeitado.');
  });

  it('rejeita token com algoritmo diferente de HS256', () => {
    const service = new TokenService(
      createConfig({ JWT_SECRET, JWT_EXPIRES_IN: '1h' }),
    );
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
      'utf8',
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'fernando',
        iat: now,
        exp: now + 3600,
        iss: 'trampo-flow-api',
        aud: 'trampo-flow-web',
        jti: 'test',
      }),
      'utf8',
    ).toString('base64url');

    expect(() => service.verify(`${header}.${payload}.assinatura`)).toThrow();
  });

  it('rejeita token assinado com outro segredo', () => {
    const service = new TokenService(
      createConfig({ JWT_SECRET, JWT_EXPIRES_IN: '1h' }),
    );
    const otherService = new TokenService(
      createConfig({ JWT_SECRET: 'b'.repeat(64), JWT_EXPIRES_IN: '1h' }),
    );
    const { token } = otherService.sign('fernando');

    expect(() => service.verify(token)).toThrow();
  });

  it('exige segredo com pelo menos 32 caracteres', () => {
    expect(
      () =>
        new TokenService(
          createConfig({ JWT_SECRET: 'curto', JWT_EXPIRES_IN: '1h' }),
        ),
    ).toThrow();
  });

  it('rejeita duração inválida', () => {
    expect(
      () =>
        new TokenService(
          createConfig({ JWT_SECRET, JWT_EXPIRES_IN: '8 horas' }),
        ),
    ).toThrow();
  });
});
