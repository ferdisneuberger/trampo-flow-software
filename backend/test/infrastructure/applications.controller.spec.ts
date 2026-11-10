import { describe, expect, it, vi } from 'vitest';
import type { CreateApplicationUseCase } from '../../src/application/applications/use-cases/create-application.use-case';
import type { DeleteApplicationUseCase } from '../../src/application/applications/use-cases/delete-application.use-case';
import type { GetApplicationStatsUseCase } from '../../src/application/applications/use-cases/get-application-stats.use-case';
import type { GetApplicationUseCase } from '../../src/application/applications/use-cases/get-application.use-case';
import type { GetBoardUseCase } from '../../src/application/applications/use-cases/get-board.use-case';
import { encodeCursor } from '../../src/application/applications/types/application-cursor';
import type { ListApplicationsUseCase } from '../../src/application/applications/use-cases/list-applications.use-case';
import type { PlaceApplicationUseCase } from '../../src/application/applications/use-cases/place-application.use-case';
import type { PreviewJobPostingUseCase } from '../../src/application/applications/use-cases/preview-job-posting.use-case';
import type { RateLimiterService } from '../../src/infrastructure/auth/rate-limiter.service';
import type { UpdateApplicationUseCase } from '../../src/application/applications/use-cases/update-application.use-case';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { ApplicationsController } from '../../src/infrastructure/http/controllers/applications.controller';
import {
  makeApplication,
  makeRestoredApplication,
} from '../factories/application.factory';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

function createController() {
  const create = vi.fn();
  const list = vi.fn();
  const update = vi.fn();
  const remove = vi.fn();
  const stats = vi.fn();
  const board = vi.fn();
  const findOne = vi.fn();
  const place = vi.fn();
  const preview = vi.fn();
  const consume = vi.fn();

  const controller = new ApplicationsController(
    { execute: create } as unknown as CreateApplicationUseCase,
    { execute: list } as unknown as ListApplicationsUseCase,
    { execute: stats } as unknown as GetApplicationStatsUseCase,
    { execute: board } as unknown as GetBoardUseCase,
    { execute: findOne } as unknown as GetApplicationUseCase,
    { execute: update } as unknown as UpdateApplicationUseCase,
    { execute: place } as unknown as PlaceApplicationUseCase,
    { execute: remove } as unknown as DeleteApplicationUseCase,
    { execute: preview } as unknown as PreviewJobPostingUseCase,
    { consume } as unknown as RateLimiterService,
  );

  return {
    controller,
    create,
    list,
    update,
    place,
    remove,
    stats,
    board,
    findOne,
    preview,
    consume,
  };
}

describe('ApplicationsController', () => {
  it('cria a candidatura do usuário do token', async () => {
    const { controller, create } = createController();
    const application = makeApplication({ status: ApplicationStatus.PENDING });

    create.mockResolvedValue(application);

    const response = await controller.create(
      {
        title: 'Backend Engineer',
        link: 'https://example.com/jobs/backend',
        company: 'Nubank',
        currentPhase: 'Triagem',
      },
      USER_ID,
    );

    const [input] = create.mock.calls[0] as [Record<string, unknown>];

    expect(input.userId).toBe(USER_ID);
    expect(response.id).toBe(application.id);
    expect(response.createdAt).toBe(application.createdAt.toISOString());
  });

  it('lista a página do usuário do token com cursor e hasMore', async () => {
    const { controller, list } = createController();
    const application = makeRestoredApplication({ title: 'Uma' });
    const nextCursor = {
      sort: 'recent' as const,
      value: application.createdAt,
      id: application.id,
    };

    list.mockResolvedValue({ items: [application], nextCursor });

    const response = await controller.list(USER_ID, {});

    expect(list).toHaveBeenCalledWith({
      userId: USER_ID,
      limit: undefined,
      sort: undefined,
      search: undefined,
      status: undefined,
      cursor: undefined,
    });
    expect(response.items).toHaveLength(1);
    expect(response.items[0]).toMatchObject({ title: 'Uma' });
    expect(typeof response.items[0]?.createdAt).toBe('string');
    expect(response.hasMore).toBe(true);
    expect(typeof response.nextCursor).toBe('string');
  });

  it('repassa busca, status, limite e ordenação para o caso de uso', async () => {
    const { controller, list } = createController();

    list.mockResolvedValue({ items: [], nextCursor: null });

    await controller.list(USER_ID, {
      search: 'nubank',
      status: ApplicationStatus.IN_PROGRESS,
      limit: 10,
      sort: 'stale',
    });

    expect(list).toHaveBeenCalledWith({
      userId: USER_ID,
      limit: 10,
      sort: 'stale',
      search: 'nubank',
      status: ApplicationStatus.IN_PROGRESS,
      cursor: undefined,
    });
  });

  it('decodifica o cursor recebido', async () => {
    const { controller, list } = createController();
    const encoded = encodeCursor({
      sort: 'recent',
      value: new Date('2026-01-01T00:00:00.000Z'),
      id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
    });

    list.mockResolvedValue({ items: [], nextCursor: null });

    await controller.list(USER_ID, { cursor: encoded });

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: {
          sort: 'recent',
          value: new Date('2026-01-01T00:00:00.000Z'),
          id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
        },
      }),
    );
  });

  it('rejeita cursor inválido', async () => {
    const { controller, list } = createController();

    await expect(
      controller.list(USER_ID, { cursor: 'invalido' }),
    ).rejects.toMatchObject({ code: 'INVALID_CURSOR' });
    expect(list).not.toHaveBeenCalled();
  });

  it('devolve os contadores do usuário', async () => {
    const { controller, stats } = createController();
    const summary = {
      total: 3,
      byStatus: { PENDING: 1, IN_PROGRESS: 2, COMPLETED: 0, REJECTED: 0 },
    };

    stats.mockResolvedValue(summary);

    await expect(controller.stats(USER_ID)).resolves.toEqual(summary);
    expect(stats).toHaveBeenCalledWith(USER_ID);
  });

  it('encaminha apenas os campos informados no update', async () => {
    const { controller, update } = createController();

    update.mockResolvedValue(makeApplication());

    await controller.update(
      '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      { currentPhase: 'Entrevista' },
      USER_ID,
    );

    expect(update).toHaveBeenCalledWith({
      userId: USER_ID,
      id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      title: undefined,
      link: undefined,
      company: undefined,
      companyUrl: undefined,
      currentPhase: 'Entrevista',
      status: undefined,
    });
  });

  it('repassa o modo de exclusão com o usuário do token', async () => {
    const { controller, remove } = createController();

    remove.mockResolvedValue(undefined);

    await controller.remove(
      '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      { mode: 'hard' },
      USER_ID,
    );

    expect(remove).toHaveBeenCalledWith({
      userId: USER_ID,
      id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      mode: 'hard',
    });
  });

  it('repassa o posicionamento com o usuário do token', async () => {
    const { controller, place } = createController();

    place.mockResolvedValue(makeApplication());

    await controller.place(
      '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      {
        status: ApplicationStatus.COMPLETED,
        beforeId: '11111111-1111-4111-8111-111111111111',
      },
      USER_ID,
    );

    expect(place).toHaveBeenCalledWith({
      userId: USER_ID,
      applicationId: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      status: ApplicationStatus.COMPLETED,
      beforeId: '11111111-1111-4111-8111-111111111111',
      afterId: undefined,
    });
  });

  it('devolve as colunas do quadro com os itens convertidos', async () => {
    const { controller, board } = createController();
    const application = makeApplication();

    board.mockResolvedValue({
      columns: [
        {
          status: ApplicationStatus.PENDING,
          total: 1,
          items: [application],
          hasMore: false,
        },
      ],
    });

    const response = await controller.board(USER_ID, {});

    expect(board).toHaveBeenCalledWith({
      userId: USER_ID,
      limitPerColumn: undefined,
      search: undefined,
    });
    expect(response.columns[0]?.items[0]?.id).toBe(application.id);
    expect(response.columns[0]?.total).toBe(1);
  });

  it('devolve a candidatura pelo id do usuário', async () => {
    const { controller, findOne } = createController();
    const application = makeApplication();

    findOne.mockResolvedValue(application);

    const response = await controller.findOne(application.id, USER_ID);

    expect(findOne).toHaveBeenCalledWith({
      id: application.id,
      userId: USER_ID,
    });
    expect(response.id).toBe(application.id);
  });

  it('busca os dados da vaga pelo link, com limite de buscas por usuário', async () => {
    const { controller, preview, consume } = createController();
    const result = {
      title: 'Dev Backend',
      company: 'Acme',
      companyUrl: 'https://acme.com',
      status: 'found' as const,
    };

    preview.mockResolvedValue(result);

    await expect(
      controller.preview({ link: 'https://acme.com/vaga' }, USER_ID),
    ).resolves.toEqual(result);
    expect(consume).toHaveBeenCalledWith(
      `preview:user:${USER_ID}`,
      20,
      60 * 1000,
    );
    expect(preview).toHaveBeenCalledWith('https://acme.com/vaga');
  });

  it('não busca a página quando o limite de buscas estoura', async () => {
    const { controller, preview, consume } = createController();

    consume.mockImplementation(() => {
      throw new Error('RATE_LIMITED');
    });

    await expect(
      controller.preview({ link: 'https://acme.com/vaga' }, USER_ID),
    ).rejects.toThrow('RATE_LIMITED');
    expect(preview).not.toHaveBeenCalled();
  });
});
