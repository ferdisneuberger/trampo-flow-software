import { describe, expect, it } from 'vitest';
import {
  normalizeUsername,
  User,
} from '../../src/domain/users/entities/user.entity';
import { DomainError } from '../../src/domain/shared/errors/domain.error';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

function expectDomainError(callback: () => unknown, code: string): void {
  try {
    callback();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return;
  }

  throw new Error(`Expected DomainError "${code}", but nothing was thrown.`);
}

describe('normalizeUsername', () => {
  it('remove espaços e converte para minúsculo', () => {
    expect(normalizeUsername('  Fernando  ')).toBe('fernando');
  });

  it('aceita ponto, hífen e underline', () => {
    expect(normalizeUsername('fernando.neuberger_1-x')).toBe(
      'fernando.neuberger_1-x',
    );
  });

  it('recusa username curto demais', () => {
    expectDomainError(() => normalizeUsername('ab'), 'USERNAME_TOO_SHORT');
  });

  it('recusa username longo demais', () => {
    expectDomainError(
      () => normalizeUsername('a'.repeat(121)),
      'USERNAME_TOO_LONG',
    );
  });

  it('recusa caracteres fora do padrão', () => {
    expectDomainError(
      () => normalizeUsername('fernando silva'),
      'USERNAME_INVALID',
    );
    expectDomainError(
      () => normalizeUsername('fernando@example'),
      'USERNAME_INVALID',
    );
  });
});

describe('User', () => {
  it('cria com id próprio, sem login e com timestamps', () => {
    const user = User.create({
      username: 'Fernando',
      passwordHash: PASSWORD_HASH,
    });

    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.username).toBe('fernando');
    expect(user.lastLoginAt).toBeNull();
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toEqual(user.createdAt);
  });

  it('recusa hash fora do formato scrypt', () => {
    expectDomainError(
      () =>
        User.create({ username: 'fernando', passwordHash: 'senha-em-texto' }),
      'INVALID_PASSWORD_HASH',
    );
  });

  it('recusa hash longo demais', () => {
    expectDomainError(
      () =>
        User.create({
          username: 'fernando',
          passwordHash: `scrypt$${'a'.repeat(250)}`,
        }),
      'PASSWORD_HASH_TOO_LONG',
    );
  });

  it('registra o último login e atualiza updatedAt', () => {
    const user = User.create({
      username: 'fernando',
      passwordHash: PASSWORD_HASH,
    });
    const loginAt = new Date('2026-05-01T12:00:00.000Z');

    user.registerLogin(loginAt);

    expect(user.lastLoginAt).toEqual(loginAt);
    expect(user.updatedAt).toEqual(loginAt);
  });

  it('recusa data de login inválida', () => {
    const user = User.create({
      username: 'fernando',
      passwordHash: PASSWORD_HASH,
    });

    expectDomainError(
      () => user.registerLogin(new Date('inválida')),
      'INVALID_LOGIN_DATE',
    );
  });

  it('restore preserva id, hash e datas', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const user = User.restore({
      id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      username: 'fernando',
      passwordHash: PASSWORD_HASH,
      lastLoginAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });

    expect(user.id).toBe('6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10');
    expect(user.lastLoginAt).toEqual(createdAt);
    expect(user.passwordHash).toBe(PASSWORD_HASH);
  });
});
