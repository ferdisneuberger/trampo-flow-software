import { beforeEach, describe, expect, it } from 'vitest';
import { ListApplicationsUseCase } from '../../src/application/applications/use-cases/list-applications.use-case';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import { makeRestoredApplication } from '../factories/application.factory';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

describe('ListApplicationsUseCase', () => {
  let repository: InMemoryApplicationRepository;
  let useCase: ListApplicationsUseCase;

  beforeEach(() => {
    repository = new InMemoryApplicationRepository();
    useCase = new ListApplicationsUseCase(repository);
  });

  it('returns an empty list when there are no applications', async () => {
    await expect(useCase.execute(USER_ID)).resolves.toEqual([]);
  });

  it('returns only active applications ordered by creation date', async () => {
    const oldest = makeRestoredApplication({
      title: 'Oldest',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const newest = makeRestoredApplication({
      title: 'Newest',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    });
    const deleted = makeRestoredApplication({
      title: 'Deleted',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
      deletedAt: new Date('2026-02-02T00:00:00.000Z'),
    });

    await repository.create(oldest, USER_ID);
    await repository.create(newest, USER_ID);
    await repository.create(deleted, USER_ID);

    const applications = await useCase.execute(USER_ID);

    expect(applications).toHaveLength(2);
    expect(applications.map((application) => application.title)).toEqual([
      'Newest',
      'Oldest',
    ]);
  });

  it('returns only the applications that belong to the given user', async () => {
    const mine = makeRestoredApplication({ title: 'Minha' });
    const other = makeRestoredApplication({ title: 'De outro' });

    await repository.create(mine, USER_ID);
    await repository.create(other, 'outro-usuario');

    const mineResult = await useCase.execute(USER_ID);
    const otherResult = await useCase.execute('outro-usuario');

    expect(mineResult.map((application) => application.title)).toEqual([
      'Minha',
    ]);
    expect(otherResult.map((application) => application.title)).toEqual([
      'De outro',
    ]);
  });
});
