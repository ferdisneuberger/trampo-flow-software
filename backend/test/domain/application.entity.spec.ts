import { describe, expect, it } from 'vitest';
import {
  Application,
  APPLICATION_COMPANY_MAX_LENGTH,
  APPLICATION_CURRENT_PHASE_MAX_LENGTH,
  APPLICATION_TITLE_MAX_LENGTH,
} from '../../src/domain/applications/entities/application.entity';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import {
  makeApplication,
  makeRestoredApplication,
} from '../factories/application.factory';
import { expectDomainError } from '../helpers/expect-domain-error';

const validCreateInput = {
  title: 'Backend Engineer',
  link: 'https://example.com/jobs/backend-engineer',
  company: 'Nubank',
  currentPhase: 'Triagem',
};

describe('Application', () => {
  it('creates an application with defaults and normalized text', () => {
    const application = Application.create({
      title: '  Backend Engineer  ',
      link: '  https://example.com/jobs/backend-engineer  ',
      company: '  Nubank  ',
      currentPhase: '  Entrevista com RH  ',
    });

    expect(application.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(application.title).toBe('Backend Engineer');
    expect(application.link).toBe('https://example.com/jobs/backend-engineer');
    expect(application.currentPhase).toBe('Entrevista com RH');
    expect(application.status).toBe(ApplicationStatus.PENDING);
    expect(application.isDeleted).toBe(false);
    expect(application.deletedAt).toBeNull();
    expect(application.createdAt).toBeInstanceOf(Date);
    expect(application.updatedAt.getTime()).toBe(
      application.createdAt.getTime(),
    );
  });

  it('creates an application with an explicit status', () => {
    const application = Application.create({
      ...validCreateInput,
      status: ApplicationStatus.IN_PROGRESS,
    });

    expect(application.status).toBe(ApplicationStatus.IN_PROGRESS);
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
    expect(application.link).toBe('https://example.com/jobs/backend-engineer');
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

  it('rejects edits after soft delete', () => {
    const application = makeRestoredApplication();
    application.softDelete();

    expectDomainError(
      () => application.updateDetails({ title: 'New title' }),
      'APPLICATION_DELETED',
    );
  });

  it('restores a persisted application', () => {
    const createdAt = new Date('2025-12-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const deletedAt = new Date('2026-02-01T00:00:00.000Z');

    const application = Application.restore({
      id: '7f0f8f3e-4e1a-4e5d-9d4c-2f8a1b7c9d01',
      title: 'Backend Engineer',
      link: 'https://example.com/jobs/backend-engineer',
      company: 'Nubank',
      companyUrl: null,
      position: 0,
      status: ApplicationStatus.REJECTED,
      currentPhase: 'Feedback final',
      createdAt,
      updatedAt,
      deletedAt,
    });

    expect(application.id).toBe('7f0f8f3e-4e1a-4e5d-9d4c-2f8a1b7c9d01');
    expect(application.status).toBe(ApplicationStatus.REJECTED);
    expect(application.currentPhase).toBe('Feedback final');
    expect(application.createdAt.toISOString()).toBe(createdAt.toISOString());
    expect(application.updatedAt.toISOString()).toBe(updatedAt.toISOString());
    expect(application.deletedAt?.toISOString()).toBe(deletedAt.toISOString());
    expect(application.isDeleted).toBe(true);
  });

  it.each([
    ['TITLE_REQUIRED', { title: '   ' }],
    ['TITLE_TOO_LONG', { title: 'a'.repeat(APPLICATION_TITLE_MAX_LENGTH + 1) }],
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

describe('Application company fields', () => {
  it('requires a company', () => {
    expectDomainError(
      () => Application.create({ ...validCreateInput, company: '   ' }),
      'COMPANY_REQUIRED',
    );
  });

  it('rejects a company shorter than two characters', () => {
    expectDomainError(
      () => Application.create({ ...validCreateInput, company: 'N' }),
      'COMPANY_TOO_SHORT',
    );
  });

  it('rejects a company longer than the limit', () => {
    expectDomainError(
      () =>
        Application.create({
          ...validCreateInput,
          company: 'a'.repeat(APPLICATION_COMPANY_MAX_LENGTH + 1),
        }),
      'COMPANY_TOO_LONG',
    );
  });

  it('accepts an optional company url', () => {
    const application = Application.create({
      ...validCreateInput,
      companyUrl: 'https://nubank.com.br',
    });

    expect(application.companyUrl).toBe('https://nubank.com.br');
  });

  it('rejects an invalid company url', () => {
    expectDomainError(
      () =>
        Application.create({
          ...validCreateInput,
          companyUrl: 'nubank.com.br',
        }),
      'INVALID_COMPANY_URL',
    );
  });

  it('treats an empty company url as absent', () => {
    const application = Application.create({
      ...validCreateInput,
      companyUrl: '   ',
    });

    expect(application.companyUrl).toBeNull();
  });

  it('updates the company and clears the url with null', () => {
    const application = Application.create({
      ...validCreateInput,
      companyUrl: 'https://nubank.com.br',
    });

    application.updateDetails({
      company: 'Stone',
      companyUrl: null,
    });

    expect(application.company).toBe('Stone');
    expect(application.companyUrl).toBeNull();
  });
});
