import { describe, expect, it } from 'vitest';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { ApplicationPresenter } from '../../src/infrastructure/http/presenters/application.presenter';
import { makeRestoredApplication } from '../factories/application.factory';

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
    expect(response).not.toHaveProperty('files');
  });

  it('serializa deletedAt quando a candidatura foi excluída', () => {
    const deletedAt = new Date('2026-03-01T10:30:00.000Z');
    const application = makeRestoredApplication({ deletedAt });

    expect(ApplicationPresenter.toHTTP(application).deletedAt).toBe(
      '2026-03-01T10:30:00.000Z',
    );
  });
});
