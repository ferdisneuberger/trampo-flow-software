import { describe, expect, it } from 'vitest';
import {
  ApplicationFile,
  APPLICATION_FILE_NAME_MAX_LENGTH,
  APPLICATION_FILE_URL_MAX_LENGTH,
} from '../../src/domain/applications/entities/application-file.entity';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import { makeApplicationFileInput } from '../factories/application.factory';
import { expectDomainError } from '../helpers/expect-domain-error';

describe('ApplicationFile', () => {
  it('creates a file with normalized metadata and a generated id', () => {
    const before = Date.now();
    const file = ApplicationFile.create(
      makeApplicationFileInput({
        name: '  resume.pdf  ',
        url: '  https://storage.example.com/resume.pdf  ',
        mimeType: 'Application/PDF',
        sizeInBytes: 2048,
      }),
    );
    const after = Date.now();

    expect(file.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(file.name).toBe('resume.pdf');
    expect(file.legacyUrl).toBe('https://storage.example.com/resume.pdf');
    expect(file.storageKey).toBeNull();
    expect(file.mimeType).toBe('application/pdf');
    expect(file.sizeInBytes).toBe(2048);
    expect(file.uploadedAt).toBeInstanceOf(Date);
    expect(file.uploadedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(file.uploadedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('preserves the provided upload date without sharing the date instance', () => {
    const uploadedAt = new Date('2026-02-01T10:30:00.000Z');
    const file = ApplicationFile.create(
      makeApplicationFileInput({ uploadedAt }),
    );

    expect(file.uploadedAt.toISOString()).toBe(uploadedAt.toISOString());

    uploadedAt.setFullYear(2030);

    expect(file.uploadedAt.toISOString()).toBe('2026-02-01T10:30:00.000Z');
  });

  it('restores a file with its persisted id and metadata', () => {
    const uploadedAt = new Date('2026-03-01T12:00:00.000Z');
    const file = ApplicationFile.restore({
      id: '3b2f7d0e-0f8f-4a37-9f9b-3d7f5f3f9a11',
      name: 'portfolio.pdf',
      storageKey: null,
      legacyUrl: 'https://storage.example.com/portfolio.pdf',
      mimeType: 'application/pdf',
      sizeInBytes: 4096,
      checksum: null,
      uploadedAt,
    });

    expect(file.id).toBe('3b2f7d0e-0f8f-4a37-9f9b-3d7f5f3f9a11');
    expect(file.name).toBe('portfolio.pdf');
    expect(file.legacyUrl).toBe('https://storage.example.com/portfolio.pdf');
    expect(file.mimeType).toBe('application/pdf');
    expect(file.sizeInBytes).toBe(4096);
    expect(file.uploadedAt.toISOString()).toBe(uploadedAt.toISOString());
  });

  it.each([
    ['FILE_NAME_REQUIRED', { name: '   ' }],
    [
      'FILE_NAME_TOO_LONG',
      { name: 'a'.repeat(APPLICATION_FILE_NAME_MAX_LENGTH + 1) },
    ],
    ['FILE_URL_REQUIRED', { url: '   ' }],
    [
      'FILE_URL_TOO_LONG',
      {
        url: `https://storage.example.com/${'a'.repeat(APPLICATION_FILE_URL_MAX_LENGTH)}`,
      },
    ],
    ['INVALID_FILE_URL', { url: 'ftp://storage.example.com/resume.pdf' }],
    ['MIME_TYPE_REQUIRED', { mimeType: '   ' }],
    ['INVALID_MIME_TYPE', { mimeType: 'pdf' }],
    ['MIME_TYPE_TOO_LONG', { mimeType: `${'a'.repeat(101)}/pdf` }],
    ['INVALID_FILE_SIZE', { sizeInBytes: 0 }],
    ['INVALID_FILE_SIZE', { sizeInBytes: -1 }],
    ['INVALID_FILE_SIZE', { sizeInBytes: 1.5 }],
    ['INVALID_FILE_SIZE', { sizeInBytes: Number.NaN }],
    ['INVALID_UPLOADED_AT', { uploadedAt: new Date('invalid') }],
  ])('rejects invalid input with %s', (code, overrides) => {
    expectDomainError(
      () => ApplicationFile.create(makeApplicationFileInput(overrides)),
      code,
    );
  });

  it('throws a DomainError for invalid metadata', () => {
    expect(() =>
      ApplicationFile.create(makeApplicationFileInput({ name: '' })),
    ).toThrow(DomainError);
  });
});
