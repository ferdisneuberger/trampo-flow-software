import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  isValidCodeChallenge,
  isValidCodeVerifier,
  verifyPkce,
} from '../../src/domain/oauth/pkce';

// Vetor de teste da RFC 7636, apêndice B.
const RFC_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

describe('PKCE S256', () => {
  it('aceita o vetor da RFC 7636', () => {
    expect(verifyPkce(RFC_VERIFIER, RFC_CHALLENGE)).toBe(true);
  });

  it('recusa verifier errado', () => {
    expect(verifyPkce(`${RFC_VERIFIER.slice(0, -1)}A`, RFC_CHALLENGE)).toBe(
      false,
    );
  });

  it('recusa `plain`: usar o challenge como verifier não funciona', () => {
    expect(verifyPkce(RFC_CHALLENGE, RFC_CHALLENGE)).toBe(false);
  });

  it('recusa verifier curto, longo ou com caracteres fora do alfabeto', () => {
    const short = 'a'.repeat(42);
    const long = 'a'.repeat(129);
    const shortChallenge = createHash('sha256')
      .update(short)
      .digest('base64url');

    expect(verifyPkce(short, shortChallenge)).toBe(false);
    expect(isValidCodeVerifier(long)).toBe(false);
    expect(isValidCodeVerifier(`${'a'.repeat(43)}!`)).toBe(false);
    expect(verifyPkce('', '')).toBe(false);
  });

  it('valida o formato do challenge (43 a 128 base64url)', () => {
    expect(isValidCodeChallenge(RFC_CHALLENGE)).toBe(true);
    expect(isValidCodeChallenge('curto')).toBe(false);
    expect(isValidCodeChallenge(`${'a'.repeat(42)}=`)).toBe(false);
    expect(isValidCodeChallenge('a'.repeat(129))).toBe(false);
  });

  it('challenge de tamanho diferente nunca confere (sem lançar)', () => {
    expect(verifyPkce(RFC_VERIFIER, `${RFC_CHALLENGE}A`)).toBe(false);
  });
});
