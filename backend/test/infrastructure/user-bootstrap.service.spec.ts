import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import { User } from '../../src/domain/users/entities/user.entity';
import type { PasswordHasher } from '../../src/domain/users/services/password-hasher';
import { UserBootstrapService } from '../../src/infrastructure/auth/user-bootstrap.service';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

function createConfig(
  values: Record<string, string | undefined>,
): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function createHasher() {
  const hash = vi.fn().mockResolvedValue(PASSWORD_HASH);

  return {
    hash,
    hasher: { hash, verify: vi.fn() } as unknown as PasswordHasher,
  };
}

describe('UserBootstrapService', () => {
  it('não faz nada quando as variáveis não estão definidas', async () => {
    const repository = new InMemoryUserRepository();
    const { hasher } = createHasher();
    const service = new UserBootstrapService(
      createConfig({}),
      repository,
      hasher,
    );

    await service.onModuleInit();

    expect(await repository.existsAny()).toBe(false);
  });

  it('cria o primeiro usuário a partir do ambiente', async () => {
    const repository = new InMemoryUserRepository();
    const { hasher, hash } = createHasher();
    const service = new UserBootstrapService(
      createConfig({
        AUTH_USERNAME: '  Fernando  ',
        AUTH_PASSWORD: 'senha-super-secreta',
      }),
      repository,
      hasher,
    );

    await service.onModuleInit();

    expect(hash).toHaveBeenCalledWith('senha-super-secreta');

    const created = await repository.findByUsername('fernando');
    expect(created?.username).toBe('fernando');
    expect(created?.passwordHash).toBe(PASSWORD_HASH);
  });

  it('não cria nada quando já existe usuário', async () => {
    const repository = new InMemoryUserRepository();
    const { hasher, hash } = createHasher();

    await repository.create(
      User.create({ username: 'existente', passwordHash: PASSWORD_HASH }),
    );

    const service = new UserBootstrapService(
      createConfig({
        AUTH_USERNAME: 'fernando',
        AUTH_PASSWORD: 'senha-super-secreta',
      }),
      repository,
      hasher,
    );

    await service.onModuleInit();

    expect(hash).not.toHaveBeenCalled();
    expect(await repository.findByUsername('fernando')).toBeNull();
  });

  it('recusa senha fora da política', async () => {
    const repository = new InMemoryUserRepository();
    const { hasher } = createHasher();
    const service = new UserBootstrapService(
      createConfig({ AUTH_USERNAME: 'fernando', AUTH_PASSWORD: 'curta' }),
      repository,
      hasher,
    );

    await expect(service.onModuleInit()).rejects.toBeInstanceOf(DomainError);
  });
});
