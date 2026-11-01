import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { AddApplicationFilesUseCase } from '../../src/application/applications/use-cases/add-application-files.use-case';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import {
  makeApplicationFile,
  makeApplicationFileInput,
  makeRestoredApplication,
} from '../factories/application.factory';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

describe('AddApplicationFilesUseCase', () => {
  let repository: InMemoryApplicationRepository;
  let useCase: AddApplicationFilesUseCase;

  beforeEach(() => {
    repository = new InMemoryApplicationRepository();
    useCase = new AddApplicationFilesUseCase(repository);
  });

  it('appends a file to an existing application and persists it', async () => {
    const existingFile = makeApplicationFile({ name: 'resume.pdf' });
    const application = makeRestoredApplication({
      files: [existingFile],
    });
    await repository.create(application, USER_ID);

    const updated = await useCase.execute({
      userId: USER_ID,
      applicationId: application.id,
      files: [
        makeApplicationFileInput({
          name: 'cover-letter.pdf',
          url: 'https://storage.example.com/cover-letter.pdf',
          sizeInBytes: 512,
        }),
      ],
    });

    expect(updated.files).toHaveLength(2);
    expect(updated.files[0].id).toBe(existingFile.id);
    expect(updated.files[1].name).toBe('cover-letter.pdf');
    expect(updated.files[1].sizeInBytes).toBe(512);
    expect(updated.updatedAt.getTime()).toBeGreaterThan(
      application.updatedAt.getTime(),
    );

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored?.files).toHaveLength(2);
    expect(stored?.files.map((file) => file.name)).toEqual([
      'resume.pdf',
      'cover-letter.pdf',
    ]);
  });

  it('appends multiple files at once with independent ids', async () => {
    const application = makeRestoredApplication();
    await repository.create(application, USER_ID);

    const updated = await useCase.execute({
      userId: USER_ID,
      applicationId: application.id,
      files: [
        makeApplicationFileInput({ name: 'resume.pdf' }),
        makeApplicationFileInput({
          name: 'certificate.pdf',
          url: 'https://storage.example.com/certificate.pdf',
          sizeInBytes: 1024,
        }),
      ],
    });

    expect(updated.files).toHaveLength(2);
    expect(updated.files[0].id).not.toBe(updated.files[1].id);
    expect(updated.files.map((file) => file.name)).toEqual([
      'resume.pdf',
      'certificate.pdf',
    ]);
  });

  it('rejects a non-existent application', async () => {
    const applicationId = randomUUID();

    await expect(
      useCase.execute({
        userId: USER_ID,
        applicationId,
        files: [makeApplicationFileInput()],
      }),
    ).rejects.toMatchObject({
      name: 'ApplicationNotFoundError',
      code: 'APPLICATION_NOT_FOUND',
    });

    expect(repository.count).toBe(0);
  });

  it('rejects a soft-deleted application', async () => {
    const application = makeRestoredApplication({
      deletedAt: new Date('2026-03-01T00:00:00.000Z'),
    });
    await repository.create(application, USER_ID);

    await expect(
      useCase.execute({
        userId: USER_ID,
        applicationId: application.id,
        files: [makeApplicationFileInput()],
      }),
    ).rejects.toMatchObject({
      name: 'ApplicationAlreadyDeletedError',
      code: 'APPLICATION_ALREADY_DELETED',
    });

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored?.files).toEqual([]);
    expect(stored?.isDeleted).toBe(true);
  });

  it('rejects an empty file list without changing the application', async () => {
    const application = makeRestoredApplication();
    await repository.create(application, USER_ID);

    await expect(
      useCase.execute({
        userId: USER_ID,
        applicationId: application.id,
        files: [],
      }),
    ).rejects.toMatchObject({
      name: 'DomainError',
      code: 'NO_FILES_PROVIDED',
    });

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored?.files).toEqual([]);
    expect(stored?.updatedAt.toISOString()).toBe(
      application.updatedAt.toISOString(),
    );
  });

  it('does not append any file when one of them is invalid', async () => {
    const application = makeRestoredApplication();
    await repository.create(application, USER_ID);

    await expect(
      useCase.execute({
        userId: USER_ID,
        applicationId: application.id,
        files: [
          makeApplicationFileInput({ name: 'resume.pdf' }),
          makeApplicationFileInput({ name: '   ' }),
        ],
      }),
    ).rejects.toMatchObject({ code: 'FILE_NAME_REQUIRED' });

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored?.files).toEqual([]);
    expect(stored?.updatedAt.toISOString()).toBe(
      application.updatedAt.toISOString(),
    );
  });

  it('rejects attaching files to an application from another user', async () => {
    const application = makeRestoredApplication();
    await repository.create(application, USER_ID);

    await expect(
      useCase.execute({
        userId: 'outro-usuario',
        applicationId: application.id,
        files: [makeApplicationFileInput()],
      }),
    ).rejects.toMatchObject({ code: 'APPLICATION_NOT_FOUND' });

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored?.files).toEqual([]);
  });
});
