import { describe, expect, it } from 'vitest';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { ApplicationPresenter } from '../../src/infrastructure/http/presenters/application.presenter';
import {
  makeApplicationFile,
  makeRestoredApplication,
} from '../factories/application.factory';

describe('ApplicationPresenter', () => {
  it('serializa datas como ISO e mantém os campos do domínio', () => {
    const application = makeRestoredApplication({
      status: ApplicationStatus.IN_PROGRESS,
      deletedAt: null,
    });

    const response = ApplicationPresenter.toHTTP(application);

    expect(response).toMatchObject({
      id: application.id,
      title: application.title,
      link: application.link,
      status: ApplicationStatus.IN_PROGRESS,
      currentPhase: application.currentPhase,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    });
    expect(typeof response.createdAt).toBe('string');
  });

  it('serializa deletedAt quando a candidatura foi excluída', () => {
    const deletedAt = new Date('2026-03-01T10:30:00.000Z');
    const application = makeRestoredApplication({ deletedAt });

    expect(ApplicationPresenter.toHTTP(application).deletedAt).toBe(
      '2026-03-01T10:30:00.000Z',
    );
  });

  it('serializa os arquivos com uploadedAt em ISO', () => {
    const application = makeRestoredApplication({
      files: [makeApplicationFile({ name: 'curriculo.pdf' })],
    });

    const [file] = ApplicationPresenter.toHTTP(application).files;

    expect(file).toMatchObject({
      name: 'curriculo.pdf',
      url: 'https://storage.example.com/resume.pdf',
      downloadUrl: null,
      mimeType: 'application/pdf',
      sizeInBytes: 1024,
    });
    expect(typeof file?.id).toBe('string');
    expect(typeof file?.uploadedAt).toBe('string');
    expect(file?.uploadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('devolve lista vazia quando não há arquivos', () => {
    expect(
      ApplicationPresenter.toHTTP(makeRestoredApplication()).files,
    ).toEqual([]);
  });
});
