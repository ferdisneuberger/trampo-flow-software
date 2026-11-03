import { describe, expect, it } from 'vitest';
import { CryptoPasswordResetTokenGenerator } from '../../src/infrastructure/auth/crypto-password-reset-token-generator';

describe('CryptoPasswordResetTokenGenerator', () => {
  it('gera tokens longos e distintos', () => {
    const generator = new CryptoPasswordResetTokenGenerator();
    const tokens = Array.from({ length: 50 }, () => generator.generate());

    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    }

    expect(new Set(tokens).size).toBe(tokens.length);
  });
});
