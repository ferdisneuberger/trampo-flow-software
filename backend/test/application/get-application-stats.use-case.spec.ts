import { beforeEach, describe, expect, it } from 'vitest';
import { GetApplicationStatsUseCase } from '../../src/application/applications/use-cases/get-application-stats.use-case';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import { makeRestoredApplication } from '../factories/application.factory';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

describe('GetApplicationStatsUseCase', () => {
  let repository: InMemoryApplicationRepository;
  let useCase: GetApplicationStatsUseCase;

  beforeEach(() => {
    repository = new InMemoryApplicationRepository();
    useCase = new GetApplicationStatsUseCase(repository);
  });

  it('devolve zeros quando não há candidaturas', async () => {
    await expect(useCase.execute(USER_ID)).resolves.toEqual({
      total: 0,
      byStatus: {
        PENDING: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0,
        REJECTED: 0,
      },
    });
  });

  it('conta por status e soma o total', async () => {
    await repository.create(
      makeRestoredApplication({ status: ApplicationStatus.PENDING }),
      USER_ID,
    );
    await repository.create(
      makeRestoredApplication({ status: ApplicationStatus.PENDING }),
      USER_ID,
    );
    await repository.create(
      makeRestoredApplication({ status: ApplicationStatus.COMPLETED }),
      USER_ID,
    );

    const stats = await useCase.execute(USER_ID);

    expect(stats.total).toBe(3);
    expect(stats.byStatus).toEqual({
      PENDING: 2,
      IN_PROGRESS: 0,
      COMPLETED: 1,
      REJECTED: 0,
    });
  });

  it('ignora excluídas e candidaturas de outro usuário', async () => {
    await repository.create(makeRestoredApplication(), USER_ID);
    await repository.create(
      makeRestoredApplication({
        deletedAt: new Date('2026-02-01T00:00:00.000Z'),
      }),
      USER_ID,
    );
    await repository.create(makeRestoredApplication(), 'outro-usuario');

    const stats = await useCase.execute(USER_ID);

    expect(stats.total).toBe(1);
  });
});
