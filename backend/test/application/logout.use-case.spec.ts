import { beforeEach, describe, expect, it } from 'vitest';
import { LogoutUseCase } from '../../src/application/auth/use-cases/logout.use-case';
import { FakeRefreshTokenGenerator } from '../helpers/fake-refresh-token-generator';
import { InMemoryRefreshTokenRepository } from '../repositories/in-memory-refresh-token.repository';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

describe('LogoutUseCase', () => {
  let repository: InMemoryRefreshTokenRepository;
  let generator: FakeRefreshTokenGenerator;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    repository = new InMemoryRefreshTokenRepository();
    generator = new FakeRefreshTokenGenerator();
    useCase = new LogoutUseCase(repository, generator);
  });

  async function seedToken(): Promise<string> {
    const token = 'token-semeado';

    await repository.create({
      id: '4f1d2c3b-5a60-4e7f-8a9b-0c1d2e3f4a5b',
      userId: USER_ID,
      tokenHash: generator.hash(token),
      familyId: '7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d',
      expiresAt: new Date(Date.now() + 1000),
      userAgent: 'vitest',
    });

    return token;
  }

  it('revoga a família do token informado', async () => {
    const token = await seedToken();

    await useCase.execute(token);

    const [record] = repository.findAll();
    expect(record?.revokedAt).toBeInstanceOf(Date);
  });

  it('não faz nada sem token', async () => {
    await useCase.execute(undefined);

    expect(repository.count).toBe(0);
  });

  it('não faz nada para token desconhecido', async () => {
    await seedToken();

    await useCase.execute('outro-token');

    const [record] = repository.findAll();
    expect(record?.revokedAt).toBeNull();
  });
});
