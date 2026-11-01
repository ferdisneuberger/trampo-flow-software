import { User as PrismaUser } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { UserMapper } from '../../src/infrastructure/database/prisma/mappers/user.mapper';
import { User } from '../../src/domain/users/entities/user.entity';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

function makeRecord(overrides: Partial<PrismaUser> = {}): PrismaUser {
  return {
    id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
    username: 'fernando',
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
    expect(user.username).toBe('fernando');
    expect(user.lastLoginAt).toBeNull();
    expect(user.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('preserva lastLoginAt quando existe', () => {
    const lastLoginAt = new Date('2026-03-01T00:00:00.000Z');
    const user = UserMapper.toDomain(makeRecord({ lastLoginAt }));

    expect(user.lastLoginAt).toEqual(lastLoginAt);
  });

  it('não inclui campos gerados no create', () => {
    const data = UserMapper.toCreateData(
      User.create({ username: 'Fernando', passwordHash: PASSWORD_HASH }),
    );

    expect(data).toMatchObject({
      username: 'fernando',
      passwordHash: PASSWORD_HASH,
    });
    expect(data).not.toHaveProperty('deletedAt');
  });

  it('no update envia apenas os campos mutáveis', () => {
    const data = UserMapper.toUpdateData(
      User.create({ username: 'Fernando', passwordHash: PASSWORD_HASH }),
    );

    expect(data).toHaveProperty('lastLoginAt');
    expect(data).toHaveProperty('updatedAt');
    expect(data).not.toHaveProperty('id');
    expect(data).not.toHaveProperty('createdAt');
  });
});
