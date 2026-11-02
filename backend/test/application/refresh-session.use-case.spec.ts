import { beforeEach, describe, expect, it } from 'vitest';
import { RefreshSessionUseCase } from '../../src/application/auth/use-cases/refresh-session.use-case';
import { UnauthorizedError } from '../../src/application/shared/errors/unauthorized.error';
import { RefreshTokenPolicy } from '../../src/domain/auth/services/refresh-token-policy';
import { FakeRefreshTokenGenerator } from '../helpers/fake-refresh-token-generator';
import { InMemoryRefreshTokenRepository } from '../repositories/in-memory-refresh-token.repository';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const GRACE_MS = 10_000;

describe('RefreshSessionUseCase', () => {
  let repository: InMemoryRefreshTokenRepository;
  let generator: FakeRefreshTokenGenerator;
  let useCase: RefreshSessionUseCase;

  beforeEach(() => {
    repository = new InMemoryRefreshTokenRepository();
    generator = new FakeRefreshTokenGenerator();
    useCase = new RefreshSessionUseCase(
      repository,
      generator,
      new RefreshTokenPolicy(TTL_MS, GRACE_MS),
    );
  });

  async function seedToken(): Promise<string> {
    const token = 'token-semeado';

    await repository.create({
      id: '4f1d2c3b-5a60-4e7f-8a9b-0c1d2e3f4a5b',
      userId: USER_ID,
      tokenHash: generator.hash(token),
      familyId: '7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d',
      expiresAt: new Date(Date.now() + TTL_MS),
      userAgent: 'vitest',
    });

    return token;
  }

  it('rotaciona o token mantendo a mesma família', async () => {
    const token = await seedToken();

    const session = await useCase.execute({ refreshToken: token });

    const [oldRecord, newRecord] = repository.findAll();

    expect(session.userId).toBe(USER_ID);
    expect(session.refreshToken).not.toBe(token);
    expect(newRecord?.familyId).toBe(oldRecord?.familyId);
    expect(oldRecord?.revokedAt).toBeInstanceOf(Date);
    expect(oldRecord?.replacedBy).toBe(newRecord?.id);
    expect(newRecord?.revokedAt).toBeNull();
  });

  it('recusa token desconhecido', async () => {
    await expect(
      useCase.execute({ refreshToken: 'nao-existe' }),
    ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
  });

  it('recusa token expirado e revoga o registro', async () => {
    const token = await seedToken();
    const [record] = repository.findAll();

    repository.markExpiredAt(record.id, new Date(0));

    await expect(
      useCase.execute({ refreshToken: token }),
    ).rejects.toMatchObject({ code: 'EXPIRED_REFRESH_TOKEN' });

    const [stored] = repository.findAll();
    expect(stored?.revokedAt).toBeInstanceOf(Date);
  });

  it('aceita reuso dentro da janela de tolerância', async () => {
    const token = await seedToken();
    const [record] = repository.findAll();

    repository.markRevokedAt(record.id, new Date(), 'token-substituto');

    const session = await useCase.execute({ refreshToken: token });

    expect(session.userId).toBe(USER_ID);
    expect(repository.count).toBe(2);
  });

  it('revoga a família inteira quando o token é reutilizado fora da janela', async () => {
    const token = await seedToken();
    const [record] = repository.findAll();

    repository.markRevokedAt(
      record.id,
      new Date(Date.now() - GRACE_MS - 1000),
      'token-substituto',
    );

    await expect(
      useCase.execute({ refreshToken: token }),
    ).rejects.toMatchObject({ code: 'REFRESH_TOKEN_REUSED' });

    const [stored] = repository.findAll();
    expect(stored?.revokedAt).toBeInstanceOf(Date);
  });

  it('não cria token novo quando o refresh é rejeitado', async () => {
    await expect(
      useCase.execute({ refreshToken: 'nao-existe' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(repository.count).toBe(0);
  });

  it('recusa token revogado por reuso mesmo dentro da janela de tolerância', async () => {
    const token = await seedToken();
    const [record] = repository.findAll();

    await repository.revokeFamily(record.familyId);

    await expect(
      useCase.execute({ refreshToken: token }),
    ).rejects.toMatchObject({ code: 'REFRESH_TOKEN_REUSED' });
    expect(repository.count).toBe(1);
  });
});
