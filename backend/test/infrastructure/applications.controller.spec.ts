import { describe, expect, it, vi } from 'vitest';
import type { AddApplicationFilesUseCase } from '../../src/application/applications/use-cases/add-application-files.use-case';
import type { CreateApplicationUseCase } from '../../src/application/applications/use-cases/create-application.use-case';
import type { DeleteApplicationUseCase } from '../../src/application/applications/use-cases/delete-application.use-case';
import type { ListApplicationsUseCase } from '../../src/application/applications/use-cases/list-applications.use-case';
import type { UpdateApplicationUseCase } from '../../src/application/applications/use-cases/update-application.use-case';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { ApplicationsController } from '../../src/infrastructure/http/controllers/applications.controller';
import {
  makeApplication,
  makeRestoredApplication,
} from '../factories/application.factory';

function createController() {
  const create = vi.fn();
  const list = vi.fn();
  const update = vi.fn();
  const remove = vi.fn();
  const addFiles = vi.fn();

  const controller = new ApplicationsController(
    { execute: create } as unknown as CreateApplicationUseCase,
    { execute: list } as unknown as ListApplicationsUseCase,
    { execute: update } as unknown as UpdateApplicationUseCase,
    { execute: remove } as unknown as DeleteApplicationUseCase,
    { execute: addFiles } as unknown as AddApplicationFilesUseCase,
  );

  return { controller, create, list, update, remove, addFiles };
}

describe('ApplicationsController', () => {
  it('cria a candidatura convertendo uploadedAt para Date', async () => {
    const { controller, create } = createController();
    const application = makeApplication({ status: ApplicationStatus.PENDING });

    create.mockResolvedValue(application);

    const response = await controller.create({
      title: 'Backend Engineer',
      link: 'https://example.com/jobs/backend',
      currentPhase: 'Triagem',
      files: [
        {
          name: 'curriculo.pdf',
          url: 'https://example.com/files/curriculo.pdf',
          mimeType: 'application/pdf',
          sizeInBytes: 1024,
          uploadedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    const [input] = create.mock.calls[0] as [Record<string, unknown>];

    expect(input.files).toEqual([
      {
        name: 'curriculo.pdf',
        url: 'https://example.com/files/curriculo.pdf',
        mimeType: 'application/pdf',
        sizeInBytes: 1024,
        uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    expect(response.id).toBe(application.id);
    expect(response.createdAt).toBe(application.createdAt.toISOString());
  });

  it('não envia a chave files quando o DTO não traz arquivos', async () => {
    const { controller, create } = createController();

    create.mockResolvedValue(makeApplication());

    await controller.create({
      title: 'Backend Engineer',
      link: 'https://example.com/jobs/backend',
      currentPhase: 'Triagem',
    });

    const [input] = create.mock.calls[0] as [Record<string, unknown>];

    expect(input.files).toBeUndefined();
  });

  it('lista convertendo entidades para HTTP', async () => {
    const { controller, list } = createController();

    list.mockResolvedValue([makeRestoredApplication({ title: 'Uma' })]);

    const response = await controller.list();

    expect(response).toHaveLength(1);
    expect(response[0]).toMatchObject({ title: 'Uma' });
    expect(typeof response[0]?.createdAt).toBe('string');
  });

  it('encaminha apenas os campos informados no update', async () => {
    const { controller, update } = createController();

    update.mockResolvedValue(makeApplication());

    await controller.update('6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10', {
      currentPhase: 'Entrevista',
    });

    expect(update).toHaveBeenCalledWith({
      id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      title: undefined,
      link: undefined,
      currentPhase: 'Entrevista',
      status: undefined,
    });
  });

  it('anexa arquivos convertendo uploadedAt para Date', async () => {
    const { controller, addFiles } = createController();

    addFiles.mockResolvedValue(makeApplication());

    await controller.addFiles('6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10', {
      files: [
        {
          name: 'portfolio.pdf',
          url: 'https://example.com/files/portfolio.pdf',
          mimeType: 'application/pdf',
          sizeInBytes: 2048,
          uploadedAt: '2026-02-01T00:00:00.000Z',
        },
      ],
    });

    expect(addFiles).toHaveBeenCalledWith({
      applicationId: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      files: [
        expect.objectContaining({
          name: 'portfolio.pdf',
          uploadedAt: new Date('2026-02-01T00:00:00.000Z'),
        }),
      ],
    });
  });

  it('repassa o modo de exclusão', async () => {
    const { controller, remove } = createController();

    remove.mockResolvedValue(undefined);

    await controller.remove('6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10', {
      mode: 'hard',
    });

    expect(remove).toHaveBeenCalledWith({
      id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      mode: 'hard',
    });
  });
});
