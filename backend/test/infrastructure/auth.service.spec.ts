import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { AuthService } from '../../src/infrastructure/auth/auth.service';
import { TokenService } from '../../src/infrastructure/auth/token.service';

const JWT_SECRET = 'a'.repeat(64);

function createConfig(
  values: Record<string, string | undefined>,
): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function createAuthService(
  overrides: Record<string, string | undefined> = {},
): AuthService {
  const config = createConfig({
    AUTH_USERNAME: 'fernando',
    AUTH_PASSWORD: 'senha-super-secreta',
    JWT_SECRET,
    JWT_EXPIRES_IN: '1h',
    ...overrides,
  });

  return new AuthService(config, new TokenService(config));
}

describe('AuthService', () => {
  it('autentica com as credenciais configuradas e emite um token', () => {
    const service = createAuthService();
    const result = service.login('fernando', 'senha-super-secreta');

    expect(result.tokenType).toBe('Bearer');
    expect(result.expiresIn).toBe(3600);
    expect(result.user).toEqual({ username: 'fernando' });
    expect(result.accessToken.split('.')).toHaveLength(3);
  });

  it('normaliza espaços no usuário', () => {
    const service = createAuthService();

    expect(service.login('  fernando  ', 'senha-super-secreta')).toBeDefined();
  });

  it('rejeita senha incorreta', () => {
    const service = createAuthService();

    expect(() => service.login('fernando', 'senha-errada')).toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita usuário incorreto', () => {
    const service = createAuthService();

    expect(() => service.login('outra-pessoa', 'senha-super-secreta')).toThrow(
      UnauthorizedException,
    );
  });

  it('identifica o usuário configurado', () => {
    const service = createAuthService();

    expect(service.isCurrentUser('fernando')).toBe(true);
    expect(service.isCurrentUser('outra-pessoa')).toBe(false);
  });

  it('exige usuário e senha no ambiente', () => {
    expect(() => createAuthService({ AUTH_USERNAME: undefined })).toThrow();
    expect(() => createAuthService({ AUTH_PASSWORD: undefined })).toThrow();
  });
});
