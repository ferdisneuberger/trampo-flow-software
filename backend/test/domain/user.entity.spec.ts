import { describe, expect, it } from 'vitest';
import {
  normalizeEmail,
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

describe('normalizeEmail', () => {
  it('remove espaços e converte para minúsculo', () => {
    expect(normalizeEmail('  Pessoa@Exemplo.com  ')).toBe('pessoa@exemplo.com');
  });

  it('recusa e-mail vazio', () => {
    expectDomainError(() => normalizeEmail('   '), 'EMAIL_REQUIRED');
  });

  it('recusa e-mail longo demais', () => {
    expectDomainError(
      () => normalizeEmail(`${'a'.repeat(250)}@example.com`),
      'EMAIL_TOO_LONG',
    );
  });

  it('recusa formato inválido', () => {
    expectDomainError(() => normalizeEmail('nao-e-email'), 'EMAIL_INVALID');
    expectDomainError(() => normalizeEmail('a@b'), 'EMAIL_INVALID');
  });
});

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
      email: 'Pessoa@Exemplo.com',
      passwordHash: PASSWORD_HASH,
    });

    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.email).toBe('pessoa@exemplo.com');
    expect(user.username).toBeNull();
    expect(user.emailVerifiedAt).toBeNull();
    expect(user.isEmailVerified).toBe(false);
    expect(user.termsAcceptedAt).toBeNull();
    expect(user.termsVersion).toBeNull();
    expect(user.lastLoginAt).toBeNull();
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toEqual(user.createdAt);
  });

  it('cria já verificado quando solicitado', () => {
    const verifiedAt = new Date('2026-01-01T00:00:00.000Z');
    const user = User.create({
      email: 'pessoa@exemplo.com',
      passwordHash: PASSWORD_HASH,
      emailVerifiedAt: verifiedAt,
      termsAcceptedAt: verifiedAt,
      termsVersion: '2026-11',
    });

    expect(user.isEmailVerified).toBe(true);
    expect(user.emailVerifiedAt).toEqual(verifiedAt);
    expect(user.termsAcceptedAt).toEqual(verifiedAt);
    expect(user.termsVersion).toBe('2026-11');
  });

  it('recusa hash fora do formato scrypt', () => {
    expectDomainError(
      () =>
        User.create({
          email: 'pessoa@exemplo.com',
          passwordHash: 'senha-em-texto',
        }),
      'INVALID_PASSWORD_HASH',
    );
  });

  it('recusa hash longo demais', () => {
    expectDomainError(
      () =>
        User.create({
          email: 'pessoa@exemplo.com',
          passwordHash: `scrypt$${'a'.repeat(250)}`,
        }),
      'PASSWORD_HASH_TOO_LONG',
    );
  });

  it('registra o último login e atualiza updatedAt', () => {
    const user = User.create({
      email: 'pessoa@exemplo.com',
      passwordHash: PASSWORD_HASH,
    });
    const loginAt = new Date('2026-05-01T12:00:00.000Z');

    user.registerLogin(loginAt);

    expect(user.lastLoginAt).toEqual(loginAt);
    expect(user.updatedAt).toEqual(loginAt);
  });

  it('recusa data de login inválida', () => {
    const user = User.create({
      email: 'pessoa@exemplo.com',
      passwordHash: PASSWORD_HASH,
    });

    expectDomainError(
      () => user.registerLogin(new Date('inválida')),
      'INVALID_LOGIN_DATE',
    );
  });

  it('cria conta Google sem senha', () => {
    const user = User.create({
      email: 'pessoa@exemplo.com',
      googleId: 'google-user-1',
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(user.googleId).toBe('google-user-1');
    expect(user.passwordHash).toBeNull();
    expect(user.isEmailVerified).toBe(true);
  });

  it('vincula a conta ao Google', () => {
    const user = User.create({
      email: 'pessoa@exemplo.com',
      passwordHash: PASSWORD_HASH,
    });
    const linkedAt = new Date('2026-05-01T12:00:00.000Z');

    user.linkGoogleAccount('google-user-1', linkedAt);

    expect(user.googleId).toBe('google-user-1');
    expect(user.updatedAt).toEqual(linkedAt);
  });

  it('recusa vincular a outro Google', () => {
    const user = User.create({
      email: 'pessoa@exemplo.com',
      googleId: 'google-user-1',
    });

    expectDomainError(
      () => user.linkGoogleAccount('google-user-2', new Date()),
      'GOOGLE_ACCOUNT_ALREADY_LINKED',
    );
  });

  it('troca a senha e atualiza updatedAt', () => {
    const user = User.create({
      email: 'pessoa@exemplo.com',
      passwordHash: PASSWORD_HASH,
    });
    const changedAt = new Date('2026-05-01T12:00:00.000Z');

    user.changePassword('scrypt$16384$8$1$bm92bw==$bmV3', changedAt);

    expect(user.passwordHash).toBe('scrypt$16384$8$1$bm92bw==$bmV3');
    expect(user.updatedAt).toEqual(changedAt);
  });

  it('recusa troca de senha com hash inválido', () => {
    const user = User.create({
      email: 'pessoa@exemplo.com',
      passwordHash: PASSWORD_HASH,
    });

    expectDomainError(
      () => user.changePassword('senha-em-texto', new Date()),
      'INVALID_PASSWORD_HASH',
    );
  });

  it('marca o e-mail como verificado', () => {
    const user = User.create({
      email: 'pessoa@exemplo.com',
      passwordHash: PASSWORD_HASH,
    });
    const verifiedAt = new Date('2026-05-01T12:00:00.000Z');

    user.markEmailVerified(verifiedAt);

    expect(user.isEmailVerified).toBe(true);
    expect(user.emailVerifiedAt).toEqual(verifiedAt);
    expect(user.updatedAt).toEqual(verifiedAt);
  });

  it('registra o envio da verificação', () => {
    const user = User.create({
      email: 'pessoa@exemplo.com',
      passwordHash: PASSWORD_HASH,
    });
    const sentAt = new Date('2026-05-01T12:00:00.000Z');

    user.markVerificationSent(sentAt);

    expect(user.verificationSentAt).toEqual(sentAt);
  });

  it('restore preserva dados legados e de autenticação', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const user = User.restore({
      id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      email: 'pessoa@exemplo.com',
      emailVerifiedAt: createdAt,
      verificationSentAt: null,
      termsAcceptedAt: createdAt,
      termsVersion: '2026-11',
      username: 'fernando',
      googleId: null,
      passwordHash: PASSWORD_HASH,
      lastLoginAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });

    expect(user.id).toBe('6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10');
    expect(user.email).toBe('pessoa@exemplo.com');
    expect(user.username).toBe('fernando');
    expect(user.lastLoginAt).toEqual(createdAt);
    expect(user.passwordHash).toBe(PASSWORD_HASH);
  });

  it('restore aceita usuário somente Google sem username', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const user = User.restore({
      id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      email: 'pessoa@exemplo.com',
      emailVerifiedAt: createdAt,
      verificationSentAt: null,
      termsAcceptedAt: null,
      termsVersion: null,
      username: null,
      googleId: null,
      passwordHash: null,
      lastLoginAt: null,
      createdAt,
      updatedAt: createdAt,
    });

    expect(user.username).toBeNull();
    expect(user.passwordHash).toBeNull();
    expect(user.isEmailVerified).toBe(true);
  });
});
