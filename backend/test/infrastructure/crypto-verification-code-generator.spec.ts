import { describe, expect, it } from 'vitest';
import { CryptoVerificationCodeGenerator } from '../../src/infrastructure/auth/crypto-verification-code-generator';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

describe('CryptoVerificationCodeGenerator', () => {
  it('gera códigos no formato XXX-XXX usando o alfabeto permitido', () => {
    const generator = new CryptoVerificationCodeGenerator();
    const codes = Array.from({ length: 200 }, () => generator.generate());

    for (const code of codes) {
      expect(code).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);

      for (const character of code.replace('-', '')) {
        expect(ALPHABET).toContain(character);
      }
    }

    expect(new Set(codes).size).toBeGreaterThan(150);
  });
});
