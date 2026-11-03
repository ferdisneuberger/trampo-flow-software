import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { HmacTokenHasher } from '../../src/infrastructure/auth/hmac-token-hasher';

function createConfig(secret: string | undefined): ConfigService {
  return {
    get: (key: string) => (key === 'AUTH_TOKEN_SECRET' ? secret : undefined),
  } as unknown as ConfigService;
}

describe('HmacTokenHasher', () => {
  it('gera HMAC SHA-256 hexadecimal determinístico', () => {
    const hasher = new HmacTokenHasher(createConfig('a'.repeat(64)));

    expect(hasher.hash('ADK-7YP')).toBe(hasher.hash('ADK-7YP'));
    expect(hasher.hash('ADK-7YP')).toMatch(/^[0-9a-f]{64}$/);
    expect(hasher.hash('ADK-7YP')).not.toBe(hasher.hash('ADK-7YQ'));
  });

  it('usa segredos diferentes para resultados diferentes', () => {
    const first = new HmacTokenHasher(createConfig('a'.repeat(64)));
    const second = new HmacTokenHasher(createConfig('b'.repeat(64)));

    expect(first.hash('ADK-7YP')).not.toBe(second.hash('ADK-7YP'));
  });

  it('recusa segredo ausente ou curto', () => {
    expect(() => new HmacTokenHasher(createConfig(undefined))).toThrow();
    expect(() => new HmacTokenHasher(createConfig('curto'))).toThrow();
  });
});
