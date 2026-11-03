import { User as PrismaUser } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { UserMapper } from '../../src/infrastructure/database/prisma/mappers/user.mapper';
import { User } from '../../src/domain/users/entities/user.entity';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';
const EMAIL = 'pessoa@exemplo.com';

function makeRecord(overrides: Partial<PrismaUser> = {}): PrismaUser {
  return {
    id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
    email: EMAIL,
    emailVerifiedAt: null,
    verificationSentAt: null,
    termsAcceptedAt: null,
    termsVersion: null,
    username: null,
    googleId: null,
    passwordHash: PASSWORD_HASH,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

describe('UserMapper', () => {
  it('converte o registro para o domínio', () => {
    const user = UserMapper.toDomain(makeRecord());

    expect(user.id).toBe('6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10');
    expect(user.email).toBe(EMAIL);
    expect(user.username).toBeNull();
    expect(user.lastLoginAt).toBeNull();
    expect(user.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('preserva o vínculo com o Google', () => {
    const user = UserMapper.toDomain(makeRecord({ googleId: 'google-user-1' }));

    expect(user.googleId).toBe('google-user-1');
  });

  it('preserva datas de verificação e termos', () => {
    const verifiedAt = new Date('2026-03-01T00:00:00.000Z');
    const user = UserMapper.toDomain(
      makeRecord({
        emailVerifiedAt: verifiedAt,
        termsAcceptedAt: verifiedAt,
        termsVersion: '2026-11',
      }),
    );

    expect(user.emailVerifiedAt).toEqual(verifiedAt);
    expect(user.isEmailVerified).toBe(true);
    expect(user.termsAcceptedAt).toEqual(verifiedAt);
    expect(user.termsVersion).toBe('2026-11');
  });

  it('não inclui campos gerados no create', () => {
    const data = UserMapper.toCreateData(
      User.create({ email: 'Pessoa@Exemplo.com', passwordHash: PASSWORD_HASH }),
    );

    expect(data).toMatchObject({
      email: EMAIL,
      username: null,
      googleId: null,
      passwordHash: PASSWORD_HASH,
    });
    expect(data).not.toHaveProperty('deletedAt');
  });

  it('no update envia apenas os campos mutáveis', () => {
    const data = UserMapper.toUpdateData(
      User.create({ email: EMAIL, passwordHash: PASSWORD_HASH }),
    );

    expect(data).toHaveProperty('lastLoginAt');
    expect(data).toHaveProperty('emailVerifiedAt');
    expect(data).toHaveProperty('updatedAt');
    expect(data).not.toHaveProperty('id');
    expect(data).not.toHaveProperty('createdAt');
  });
});
