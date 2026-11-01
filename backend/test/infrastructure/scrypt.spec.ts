import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  verifyPassword,
} from '../../src/infrastructure/auth/scrypt';

describe('scrypt', () => {
  it('gera hash no formato scrypt$N$r$p$salt$key', async () => {
    const hash = await hashPassword('senha-super-secreta');

    expect(hash.split('$')).toHaveLength(6);
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(hash).not.toContain('senha-super-secreta');
  });

  it('valida a senha correta', async () => {
    const hash = await hashPassword('senha-super-secreta');

    await expect(verifyPassword('senha-super-secreta', hash)).resolves.toBe(
      true,
    );
  });

  it('recusa senha errada', async () => {
    const hash = await hashPassword('senha-super-secreta');

    await expect(verifyPassword('outra-senha', hash)).resolves.toBe(false);
  });

  it('gera sais diferentes para a mesma senha', async () => {
    const first = await hashPassword('senha-super-secreta');
    const second = await hashPassword('senha-super-secreta');

    expect(first).not.toBe(second);
    await expect(verifyPassword('senha-super-secreta', first)).resolves.toBe(
      true,
    );
    await expect(verifyPassword('senha-super-secreta', second)).resolves.toBe(
      true,
    );
  });

  it('normaliza unicode antes de derivar', async () => {
    const hash = await hashPassword('senha-com-ação');

    await expect(verifyPassword('senha-com-ação', hash)).resolves.toBe(true);
  });

  it('recusa hash malformado sem lançar', async () => {
    await expect(verifyPassword('senha', 'texto-puro')).resolves.toBe(false);
    await expect(verifyPassword('senha', 'scrypt$1$2$3')).resolves.toBe(false);
    await expect(
      verifyPassword('senha', 'bcrypt$16384$8$1$c2FsdA==$a2V5'),
    ).resolves.toBe(false);
  });

  it('recusa parâmetros fora do limite', async () => {
    const hash = await hashPassword('senha-super-secreta');
    const parts = hash.split('$');
    parts[1] = '99999999999';

    await expect(
      verifyPassword('senha-super-secreta', parts.join('$')),
    ).resolves.toBe(false);
  });
});
