import { beforeEach, describe, expect, it } from 'vitest';
import { CreateSessionUseCase } from '../../src/application/auth/use-cases/create-session.use-case';
import { RefreshTokenPolicy } from '../../src/domain/auth/services/refresh-token-policy';
import { FakeRefreshTokenGenerator } from '../helpers/fake-refresh-token-generator';
import { InMemoryRefreshTokenRepository } from '../repositories/in-memory-refresh-token.repository';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

describe('CreateSessionUseCase', () => {
  let repository: InMemoryRefreshTokenRepository;
  let useCase: CreateSessionUseCase;

  beforeEach(() => {
    repository = new InMemoryRefreshTokenRepository();
    useCase = new CreateSessionUseCase(
      repository,
      new FakeRefreshTokenGenerator(),
      new RefreshTokenPolicy(TTL_MS, 10_000),
    );
  });

  it('cria o refresh token com hash, família e validade', async () => {
    const session = await useCase.execute({
      userId: USER_ID,
      userAgent: 'vitest',
    });

    const [record] = repository.findAll();

    expect(session.refreshToken).toBe('token-1');
    expect(record?.userId).toBe(USER_ID);
    expect(record?.userAgent).toBe('vitest');
    expect(record?.familyId).toMatch(/^[0-9a-f-]{36}$/);
    expect(record?.tokenHash).not.toBe(session.refreshToken);
    expect(record?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(session.refreshTokenExpiresAt).toEqual(record?.expiresAt);
  });

  it('remove tokens expirados antes de criar um novo', async () => {
    await useCase.execute({ userId: USER_ID });

    const [record] = repository.findAll();
    repository.markExpiredAt(record.id, new Date(0));

    await useCase.execute({ userId: USER_ID });

    expect(repository.count).toBe(1);
  });
});
