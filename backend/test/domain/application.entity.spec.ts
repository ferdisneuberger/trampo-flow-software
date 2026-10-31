import { describe, expect, it } from 'vitest';
import {
  Application,
  APPLICATION_CURRENT_PHASE_MAX_LENGTH,
  APPLICATION_TITLE_MAX_LENGTH,
} from '../../src/domain/applications/entities/application.entity';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import {
  makeApplication,
  makeApplicationFile,
  makeRestoredApplication,
} from '../factories/application.factory';
import { expectDomainError } from '../helpers/expect-domain-error';

const validCreateInput = {
  title: 'Backend Engineer',
  link: 'https://example.com/jobs/backend-engineer',
  currentPhase: 'Triagem',
};

describe('Application', () => {
  it('creates an application with defaults and normalized text', () => {
    const application = Application.create({
      title: '  Backend Engineer  ',
      link: '  https://example.com/jobs/backend-engineer  ',
      currentPhase: '  Entrevista com RH  ',
    });

    expect(application.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(application.title).toBe('Backend Engineer');
    expect(application.link).toBe('https://example.com/jobs/backend-engineer');
    expect(application.currentPhase).toBe('Entrevista com RH');
    expect(application.status).toBe(ApplicationStatus.PENDING);
    expect(application.files).toEqual([]);
    expect(application.isDeleted).toBe(false);
    expect(application.deletedAt).toBeNull();
    expect(application.createdAt).toBeInstanceOf(Date);
    expect(application.updatedAt.getTime()).toBe(
      application.createdAt.getTime(),
    );
  });

  it('creates an application with an explicit status and multiple files', () => {
    const application = Application.create({
      ...validCreateInput,
      status: ApplicationStatus.IN_PROGRESS,
      files: [
        makeApplicationFile({ name: 'resume.pdf' }),
        makeApplicationFile({
          name: 'portfolio.pdf',
          url: 'https://storage.example.com/portfolio.pdf',
          sizeInBytes: 2048,
        }),
      ],
    });

    expect(application.status).toBe(ApplicationStatus.IN_PROGRESS);
    expect(application.files).toHaveLength(2);
    expect(application.files[0].name).toBe('resume.pdf');
    expect(application.files[1].name).toBe('portfolio.pdf');
    expect(application.files[0].id).not.toBe(application.files[1].id);
  });

  it('updates editable fields and refreshes updatedAt', () => {
    const application = makeRestoredApplication();

    application.updateDetails({
      title: '  Staff Engineer  ',
      link: '  https://example.com/jobs/staff-engineer  ',
      currentPhase: '  Proposta  ',
      status: ApplicationStatus.COMPLETED,
    });

    expect(application.title).toBe('Staff Engineer');
    expect(application.link).toBe('https://example.com/jobs/staff-engineer');
    expect(application.currentPhase).toBe('Proposta');
    expect(application.status).toBe(ApplicationStatus.COMPLETED);
    expect(application.updatedAt.getTime()).toBeGreaterThan(
      application.createdAt.getTime(),
    );
  });

  it('keeps files when editing details', () => {
    const file = makeApplicationFile();
    const application = makeRestoredApplication({ files: [file] });

    application.updateDetails({ currentPhase: 'Entrevista técnica' });

    expect(application.files).toHaveLength(1);
    expect(application.files[0].id).toBe(file.id);
  });

  it('rejects an update without any fields', () => {
    const application = makeRestoredApplication();

    expectDomainError(
      () => application.updateDetails({}),
      'NO_FIELDS_TO_UPDATE',
    );
  });

  it('does not partially mutate the application when a field is invalid', () => {
    const application = makeRestoredApplication();

    expectDomainError(
      () =>
        application.updateDetails({
          title: 'New title',
          link: 'ftp://example.com/jobs',
        }),
      'INVALID_LINK',
    );

    expect(application.title).toBe('Backend Engineer');
    expect(application.link).toBe(
      'https://example.com/jobs/backend-engineer',
    );
  });

  it('adds multiple files and refreshes updatedAt', () => {
    const application = makeRestoredApplication();

    application.addFiles([
      makeApplicationFile({ name: 'resume.pdf' }),
      makeApplicationFile({
        name: 'cover-letter.pdf',
        url: 'https://storage.example.com/cover-letter.pdf',
        sizeInBytes: 512,
      }),
    ]);

    expect(application.files).toHaveLength(2);
    expect(application.files.map((file) => file.name)).toEqual([
      'resume.pdf',
      'cover-letter.pdf',
    ]);
    expect(application.updatedAt.getTime()).toBeGreaterThan(
      application.createdAt.getTime(),
    );
  });

  it('does not append files when one of them is invalid', () => {
    const application = makeRestoredApplication();

    expectDomainError(
      () =>
        application.addFiles([
          makeApplicationFile({ name: 'resume.pdf' }),
          makeApplicationFile({ name: '   ' }),
        ]),
      'FILE_NAME_REQUIRED',
    );

    expect(application.files).toHaveLength(0);
  });

  it('rejects an empty file list', () => {
    const application = makeRestoredApplication();

    expectDomainError(() => application.addFiles([]), 'NO_FILES_PROVIDED');
  });

  it('soft deletes an application and updates timestamps', () => {
    const application = makeRestoredApplication();

    application.softDelete();

    expect(application.isDeleted).toBe(true);
    expect(application.deletedAt).toBeInstanceOf(Date);
    expect(application.updatedAt.getTime()).toBe(
      application.deletedAt?.getTime(),
    );
  });

  it('rejects a second soft delete', () => {
    const application = makeRestoredApplication();
    application.softDelete();

    expectDomainError(
      () => application.softDelete(),
      'APPLICATION_ALREADY_DELETED',
    );
  });

  it('rejects edits and new files after soft delete', () => {
    const application = makeRestoredApplication();
    application.softDelete();

    expectDomainError(
      () => application.updateDetails({ title: 'New title' }),
      'APPLICATION_DELETED',
    );
    expectDomainError(
      () => application.addFiles([makeApplicationFile()]),
      'APPLICATION_DELETED',
    );
  });

  it('restores a persisted application', () => {
    const file = makeApplicationFile();
    const createdAt = new Date('2025-12-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const deletedAt = new Date('2026-02-01T00:00:00.000Z');

    const application = Application.restore({
      id: '7f0f8f3e-4e1a-4e5d-9d4c-2f8a1b7c9d01',
      title: 'Backend Engineer',
      link: 'https://example.com/jobs/backend-engineer',
      status: ApplicationStatus.REJECTED,
      currentPhase: 'Feedback final',
      files: [file],
      createdAt,
      updatedAt,
      deletedAt,
    });

    expect(application.id).toBe('7f0f8f3e-4e1a-4e5d-9d4c-2f8a1b7c9d01');
    expect(application.status).toBe(ApplicationStatus.REJECTED);
    expect(application.currentPhase).toBe('Feedback final');
    expect(application.files).toHaveLength(1);
    expect(application.files[0].id).toBe(file.id);
    expect(application.createdAt.toISOString()).toBe(createdAt.toISOString());
    expect(application.updatedAt.toISOString()).toBe(updatedAt.toISOString());
    expect(application.deletedAt?.toISOString()).toBe(deletedAt.toISOString());
    expect(application.isDeleted).toBe(true);
  });

  it('returns a defensive copy of the files list', () => {
    const application = makeRestoredApplication({
      files: [makeApplicationFile()],
    });

    const files = application.files;
    files.pop();

    expect(application.files).toHaveLength(1);
  });

  it.each([
    ['TITLE_REQUIRED', { title: '   ' }],
    [
      'TITLE_TOO_LONG',
      { title: 'a'.repeat(APPLICATION_TITLE_MAX_LENGTH + 1) },
    ],
    ['LINK_REQUIRED', { link: '   ' }],
    ['INVALID_LINK', { link: 'not-a-url' }],
    ['INVALID_LINK', { link: 'ftp://example.com/jobs/1' }],
    ['CURRENT_PHASE_REQUIRED', { currentPhase: '   ' }],
    [
      'CURRENT_PHASE_TOO_LONG',
      { currentPhase: 'a'.repeat(APPLICATION_CURRENT_PHASE_MAX_LENGTH + 1) },
    ],
    ['INVALID_STATUS', { status: 'ARCHIVED' as ApplicationStatus }],
  ])('rejects invalid creation input with %s', (code, overrides) => {
    expectDomainError(
      () => Application.create({ ...validCreateInput, ...overrides }),
      code,
    );
  });

  it('throws a DomainError for invalid creation input', () => {
    expect(() =>
      Application.create({ ...validCreateInput, title: '' }),
    ).toThrow(DomainError);
  });

  it('creates an application through the factory with a custom title', () => {
    expect(makeApplication({ title: 'Staff Engineer' }).title).toBe(
      'Staff Engineer',
    );
  });
});
