import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  UpdateApplicationInput,
  UpdateApplicationUseCase,
} from '../../src/application/applications/use-cases/update-application.use-case';
import { Application } from '../../src/domain/applications/entities/application.entity';
import { ApplicationFile } from '../../src/domain/applications/entities/application-file.entity';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import {
  makeApplicationFile,
  makeRestoredApplication,
} from '../factories/application.factory';

describe('UpdateApplicationUseCase', () => {
  let repository: InMemoryApplicationRepository;
  let useCase: UpdateApplicationUseCase;
  let application: Application;
  let file: ApplicationFile;

  beforeEach(async () => {
    repository = new InMemoryApplicationRepository();
    useCase = new UpdateApplicationUseCase(repository);
    file = makeApplicationFile();
    application = makeRestoredApplication({ files: [file] });

    await repository.create(application);
  });

  it('updates the title and preserves the other fields and files', async () => {
    const updated = await useCase.execute({
      id: application.id,
      title: '  Staff Engineer  ',
    });

    expect(updated.id).toBe(application.id);
    expect(updated.title).toBe('Staff Engineer');
    expect(updated.link).toBe(application.link);
    expect(updated.currentPhase).toBe(application.currentPhase);
    expect(updated.status).toBe(application.status);
    expect(updated.files).toHaveLength(1);
    expect(updated.files[0].id).toBe(file.id);
    expect(updated.createdAt.toISOString()).toBe(
      application.createdAt.toISOString(),
    );
    expect(updated.updatedAt.getTime()).toBeGreaterThan(
      application.updatedAt.getTime(),
    );
  });

  it('updates the link', async () => {
    const updated = await useCase.execute({
      id: application.id,
      link: '  https://example.com/jobs/new-role  ',
    });

    expect(updated.link).toBe('https://example.com/jobs/new-role');
    expect(updated.title).toBe(application.title);
  });

  it('updates the current phase', async () => {
    const updated = await useCase.execute({
      id: application.id,
      currentPhase: '  Entrevista técnica  ',
    });

    expect(updated.currentPhase).toBe('Entrevista técnica');
    expect(updated.status).toBe(ApplicationStatus.PENDING);
  });

  it.each([
    ApplicationStatus.PENDING,
    ApplicationStatus.IN_PROGRESS,
    ApplicationStatus.COMPLETED,
    ApplicationStatus.REJECTED,
  ])('updates the fixed status to %s', async (status) => {
    const updated = await useCase.execute({
      id: application.id,
      status,
    });

    expect(updated.status).toBe(status);
  });

  it('updates multiple fields at once', async () => {
    const updated = await useCase.execute({
      id: application.id,
      title: '  Engineering Manager  ',
      link: '  https://example.com/jobs/engineering-manager  ',
      currentPhase: '  Proposta  ',
      status: ApplicationStatus.COMPLETED,
    });

    expect(updated.title).toBe('Engineering Manager');
    expect(updated.link).toBe('https://example.com/jobs/engineering-manager');
    expect(updated.currentPhase).toBe('Proposta');
    expect(updated.status).toBe(ApplicationStatus.COMPLETED);
    expect(updated.files[0].id).toBe(file.id);
  });

  it('persists the updated application in the repository', async () => {
    await useCase.execute({
      id: application.id,
      title: 'Staff Engineer',
      currentPhase: 'Proposta',
      status: ApplicationStatus.COMPLETED,
    });

    const stored = await repository.findById(application.id);

    expect(stored?.title).toBe('Staff Engineer');
    expect(stored?.currentPhase).toBe('Proposta');
    expect(stored?.status).toBe(ApplicationStatus.COMPLETED);
    expect(stored?.files).toHaveLength(1);
    expect(stored?.files[0].id).toBe(file.id);
  });

  it('rejects an update for a non-existent application', async () => {
    const id = randomUUID();

    await expect(
      useCase.execute({ id, title: 'New title' }),
    ).rejects.toMatchObject({
      name: 'ApplicationNotFoundError',
      code: 'APPLICATION_NOT_FOUND',
    });

    expect(await repository.findById(id)).toBeNull();
  });

  it('rejects an update for a soft-deleted application', async () => {
    const deleted = makeRestoredApplication({
      deletedAt: new Date('2026-03-01T00:00:00.000Z'),
    });

    await repository.clear();
    await repository.create(deleted);

    await expect(
      useCase.execute({ id: deleted.id, title: 'New title' }),
    ).rejects.toMatchObject({
      name: 'ApplicationAlreadyDeletedError',
      code: 'APPLICATION_ALREADY_DELETED',
    });

    const stored = await repository.findById(deleted.id);

    expect(stored?.title).toBe('Backend Engineer');
    expect(stored?.isDeleted).toBe(true);
  });

  it('rejects an update without any fields', async () => {
    await expect(useCase.execute({ id: application.id })).rejects.toMatchObject(
      {
        name: 'DomainError',
        code: 'NO_FIELDS_TO_UPDATE',
      },
    );

    const stored = await repository.findById(application.id);

    expect(stored?.title).toBe(application.title);
    expect(stored?.updatedAt.toISOString()).toBe(
      application.updatedAt.toISOString(),
    );
  });

  it('does not mutate the stored application when validation fails', async () => {
    await expect(
      useCase.execute({
        id: application.id,
        title: 'New title',
        link: 'ftp://example.com/jobs/new-role',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_LINK' });

    const stored = await repository.findById(application.id);

    expect(stored?.title).toBe('Backend Engineer');
    expect(stored?.link).toBe('https://example.com/jobs/backend-engineer');
    expect(stored?.updatedAt.toISOString()).toBe(
      application.updatedAt.toISOString(),
    );
  });

  it.each<[string, Omit<UpdateApplicationInput, 'id'>]>([
    ['TITLE_REQUIRED', { title: '   ' }],
    ['TITLE_TOO_LONG', { title: 'a'.repeat(121) }],
    ['LINK_REQUIRED', { link: '   ' }],
    ['INVALID_LINK', { link: 'not-a-url' }],
    ['LINK_TOO_LONG', { link: `https://example.com/${'a'.repeat(2048)}` }],
    ['CURRENT_PHASE_REQUIRED', { currentPhase: '   ' }],
    ['CURRENT_PHASE_TOO_LONG', { currentPhase: 'a'.repeat(121) }],
    ['INVALID_STATUS', { status: 'ARCHIVED' as ApplicationStatus }],
  ])('rejects invalid update input with %s', async (code, overrides) => {
    await expect(
      useCase.execute({ id: application.id, ...overrides }),
    ).rejects.toMatchObject({ code });

    const stored = await repository.findById(application.id);

    expect(stored?.title).toBe('Backend Engineer');
    expect(stored?.link).toBe('https://example.com/jobs/backend-engineer');
    expect(stored?.currentPhase).toBe('Triagem');
    expect(stored?.status).toBe(ApplicationStatus.PENDING);
    expect(stored?.updatedAt.toISOString()).toBe(
      application.updatedAt.toISOString(),
    );
  });
});
