import { describe, expect, it, vi } from 'vitest';
import { AuthSettings } from '../../src/application/auth/services/auth-settings';
import { GoogleSignInUseCase } from '../../src/application/auth/use-cases/google-sign-in.use-case';
import { ConflictError } from '../../src/application/shared/errors/conflict.error';
import { ForbiddenError } from '../../src/application/shared/errors/forbidden.error';
import {
  GoogleIdentityVerifier,
  type GoogleIdentity,
} from '../../src/domain/auth/services/google-identity-verifier';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import { User } from '../../src/domain/users/entities/user.entity';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';
const EMAIL = 'pessoa@exemplo.com';
const GOOGLE_ID = 'google-user-1';

function makeSettings(): AuthSettings {
  return new AuthSettings(
    true,
    24 * 60 * 60 * 1000,
    120 * 1000,
    15 * 60 * 1000,
    '2026-11',
    'https://app.exemplo.com',
  );
}

function makeVerifier(identity: GoogleIdentity): GoogleIdentityVerifier {
  return {
    verify: vi.fn().mockResolvedValue(identity),
  };
}

async function setup(identity: Partial<GoogleIdentity> = {}) {
  const users = new InMemoryUserRepository();
  const verifier = makeVerifier({
    googleId: GOOGLE_ID,
    email: EMAIL,
    emailVerified: true,
    ...identity,
  });
  const useCase = new GoogleSignInUseCase(verifier, users, makeSettings());

  return { useCase, users, verifier };
}

describe('GoogleSignInUseCase', () => {
  it('exige aceite dos termos para criar conta nova', async () => {
    const { useCase, users } = await setup();

    await expect(
      useCase.execute({ credential: 'credential' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(await users.findByEmail(EMAIL)).toBeNull();
  });

  it('cria conta verificada e sem senha', async () => {
    const { useCase, users } = await setup();

    const result = await useCase.execute({
      credential: 'credential',
      termsAccepted: true,
    });

    expect(result.isNew).toBe(true);
    expect(result.user.email).toBe(EMAIL);
    expect(result.user.googleId).toBe(GOOGLE_ID);
    expect(result.user.isEmailVerified).toBe(true);
    expect(result.user.passwordHash).toBeNull();
    expect(result.user.termsVersion).toBe('2026-11');
    expect(await users.findByGoogleId(GOOGLE_ID)).not.toBeNull();
  });

  it('entra em conta já vinculada ao Google', async () => {
    const { useCase, users } = await setup();

    await users.create(
      User.create({
        email: EMAIL,
        googleId: GOOGLE_ID,
        emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );

    const result = await useCase.execute({ credential: 'credential' });

    expect(result.isNew).toBe(false);
    expect(result.user.lastLoginAt).toBeInstanceOf(Date);
  });

  it('vincula conta de e-mail já verificada', async () => {
    const { useCase, users } = await setup();

    await users.create(
      User.create({
        email: EMAIL,
        passwordHash: PASSWORD_HASH,
        emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );

    const result = await useCase.execute({ credential: 'credential' });

    expect(result.isNew).toBe(false);
    expect(result.user.googleId).toBe(GOOGLE_ID);
    expect(result.user.passwordHash).toBe(PASSWORD_HASH);
  });

  it('não vincula conta de e-mail não verificada', async () => {
    const { useCase, users } = await setup();

    await users.create(
      User.create({ email: EMAIL, passwordHash: PASSWORD_HASH }),
    );

    await expect(
      useCase.execute({ credential: 'credential' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('recusa e-mail não verificado pelo Google', async () => {
    const { useCase } = await setup({ emailVerified: false });

    await expect(
      useCase.execute({ credential: 'credential', termsAccepted: true }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
