import { createHash, timingSafeEqual } from 'node:crypto';

/** RFC 7636: `code_challenge` S256 tem 43 caracteres; aceita até 128. */
const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;

export function isValidCodeChallenge(value: string): boolean {
  return CODE_CHALLENGE_PATTERN.test(value);
}

export function isValidCodeVerifier(value: string): boolean {
  return CODE_VERIFIER_PATTERN.test(value);
}

/** PKCE S256 com comparação em tempo constante. */
export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!isValidCodeVerifier(verifier)) {
    return false;
  }

  const computed = Buffer.from(
    createHash('sha256').update(verifier).digest('base64url'),
  );
  const expected = Buffer.from(challenge);

  return (
    computed.length === expected.length && timingSafeEqual(computed, expected)
  );
}
