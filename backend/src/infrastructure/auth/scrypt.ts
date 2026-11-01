import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const SCHEME = 'scrypt';
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 64 * 1024 * 1024;

// Limites de sanidade: o hash vem do banco, então não confiamos cegamente nos
// parâmetros gravados (um N absurdo travaria o processo).
const MAX_COST = 1_048_576;
const MAX_BLOCK_SIZE = 32;
const MAX_PARALLELIZATION = 16;

/**
 * Formato: `scrypt$N$r$p$saltBase64$keyBase64`.
 * Os parâmetros ficam no próprio registro, então subir o custo depois não
 * invalida as senhas já gravadas.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scryptAsync(password.normalize('NFKC'), salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: MAX_MEMORY,
  });

  return [
    SCHEME,
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, cost, blockSize, parallelization, salt, key] =
    stored.split('$');

  if (scheme !== SCHEME || !salt || !key) {
    return false;
  }

  const N = Number(cost);
  const r = Number(blockSize);
  const p = Number(parallelization);

  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    N < 2 ||
    N > MAX_COST ||
    (N & (N - 1)) !== 0 ||
    r < 1 ||
    r > MAX_BLOCK_SIZE ||
    p < 1 ||
    p > MAX_PARALLELIZATION
  ) {
    return false;
  }

  const expected = Buffer.from(key, 'base64');

  if (expected.length === 0) {
    return false;
  }

  const derived = await scryptAsync(
    password.normalize('NFKC'),
    Buffer.from(salt, 'base64'),
    expected.length,
    { N, r, p, maxmem: MAX_MEMORY },
  );

  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}
