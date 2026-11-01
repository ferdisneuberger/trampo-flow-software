import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DeleteApplicationUseCase } from '../../src/application/applications/use-cases/delete-application.use-case';
import { ApplicationDeleteMode } from '../../src/application/applications/types/application-delete-mode';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import {
  makeApplicationFile,
  makeRestoredApplication,
} from '../factories/application.factory';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

describe('DeleteApplicationUseCase', () => {
  let repository: InMemoryApplicationRepository;
  let useCase: DeleteApplicationUseCase;

  beforeEach(() => {
    repository = new InMemoryApplicationRepository();
    useCase = new DeleteApplicationUseCase(repository);
  });

  it('soft deletes by default and keeps the record in the repository', async () => {
    const application = makeRestoredApplication();
    await repository.create(application, USER_ID);

    await useCase.execute({ userId: USER_ID, id: application.id });

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored).not.toBeNull();
    expect(stored?.isDeleted).toBe(true);
    expect(stored?.deletedAt).toBeInstanceOf(Date);
    expect(stored?.updatedAt.toISOString()).toBe(
      stored?.deletedAt?.toISOString(),
    );
    expect(repository.count).toBe(1);
    expect(await repository.findAll(USER_ID)).toEqual([]);
    expect(
      await repository.findAll(USER_ID, { includeDeleted: true }),
    ).toHaveLength(1);
  });

  it('soft deletes with an explicit mode and preserves attached files', async () => {
    const file = makeApplicationFile();
    const application = makeRestoredApplication({ files: [file] });
    await repository.create(application, USER_ID);

    await useCase.execute({
      userId: USER_ID,
      id: application.id,
      mode: 'soft',
    });

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored?.isDeleted).toBe(true);
    expect(stored?.files).toHaveLength(1);
    expect(stored?.files[0].id).toBe(file.id);
  });

  it('physically deletes the application with hard mode', async () => {
    const application = makeRestoredApplication();
    await repository.create(application, USER_ID);

    await useCase.execute({
      userId: USER_ID,
      id: application.id,
      mode: 'hard',
    });

    expect(await repository.findById(application.id, USER_ID)).toBeNull();
    expect(await repository.findAll(USER_ID, { includeDeleted: true })).toEqual(
      [],
    );
    expect(repository.count).toBe(0);
  });

  it('hard deletes an application that was previously soft deleted', async () => {
    const application = makeRestoredApplication();
    await repository.create(application, USER_ID);

    await useCase.execute({
      userId: USER_ID,
      id: application.id,
      mode: 'soft',
    });
    expect(repository.count).toBe(1);

    await useCase.execute({
      userId: USER_ID,
      id: application.id,
      mode: 'hard',
    });

    expect(repository.count).toBe(0);
    expect(await repository.findById(application.id, USER_ID)).toBeNull();
  });

  it('rejects a second soft delete without changing the deletion date', async () => {
    const application = makeRestoredApplication();
    await repository.create(application, USER_ID);

    await useCase.execute({ userId: USER_ID, id: application.id });

    const firstDeletion = await repository.findById(application.id, USER_ID);

    await expect(
      useCase.execute({ userId: USER_ID, id: application.id, mode: 'soft' }),
    ).rejects.toMatchObject({
      name: 'ApplicationAlreadyDeletedError',
      code: 'APPLICATION_ALREADY_DELETED',
    });

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored?.deletedAt?.toISOString()).toBe(
      firstDeletion?.deletedAt?.toISOString(),
    );
    expect(repository.count).toBe(1);
  });

  it.each(['soft', 'hard'] as const)(
    'rejects %s deletion for a non-existent application',
    async (mode) => {
      const id = randomUUID();

      await expect(
        useCase.execute({ userId: USER_ID, id, mode }),
      ).rejects.toMatchObject({
        name: 'ApplicationNotFoundError',
        code: 'APPLICATION_NOT_FOUND',
      });

      expect(repository.count).toBe(0);
    },
  );

  it('rejects an invalid deletion mode without changing the application', async () => {
    const application = makeRestoredApplication();
    await repository.create(application, USER_ID);

    await expect(
      useCase.execute({
        userId: USER_ID,
        id: application.id,
        mode: 'purge' as ApplicationDeleteMode,
      }),
    ).rejects.toMatchObject({
      name: 'ApplicationError',
      code: 'INVALID_DELETE_MODE',
    });

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored?.isDeleted).toBe(false);
    expect(stored?.deletedAt).toBeNull();
    expect(repository.count).toBe(1);
  });

  it('rejects deleting an application from another user', async () => {
    const application = makeRestoredApplication();
    await repository.create(application, USER_ID);

    await expect(
      useCase.execute({ userId: 'outro-usuario', id: application.id }),
    ).rejects.toMatchObject({ code: 'APPLICATION_NOT_FOUND' });

    expect(repository.count).toBe(1);
  });
});
