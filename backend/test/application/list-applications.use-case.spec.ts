import { beforeEach, describe, expect, it } from 'vitest';
import { ListApplicationsUseCase } from '../../src/application/applications/use-cases/list-applications.use-case';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import { makeRestoredApplication } from '../factories/application.factory';

describe('ListApplicationsUseCase', () => {
  let repository: InMemoryApplicationRepository;
  let useCase: ListApplicationsUseCase;

  beforeEach(() => {
    repository = new InMemoryApplicationRepository();
    useCase = new ListApplicationsUseCase(repository);
  });

  it('returns an empty list when there are no applications', async () => {
    await expect(useCase.execute()).resolves.toEqual([]);
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

    await repository.create(oldest);
    await repository.create(newest);
    await repository.create(deleted);

    const applications = await useCase.execute();

    expect(applications).toHaveLength(2);
    expect(applications.map((application) => application.title)).toEqual([
      'Newest',
      'Oldest',
    ]);
  });
});
