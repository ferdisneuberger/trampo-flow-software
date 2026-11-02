import { beforeEach, describe, expect, it } from 'vitest';
import { GetBoardUseCase } from '../../src/application/applications/use-cases/get-board.use-case';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import { makeRestoredApplication } from '../factories/application.factory';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

describe('GetBoardUseCase', () => {
  let repository: InMemoryApplicationRepository;
  let useCase: GetBoardUseCase;

  beforeEach(() => {
    repository = new InMemoryApplicationRepository();
    useCase = new GetBoardUseCase(repository);
  });

  async function seed(
    title: string,
    status: ApplicationStatus,
    position: number,
    overrides: Partial<Parameters<typeof makeRestoredApplication>[0]> = {},
  ) {
    const application = makeRestoredApplication({
      title,
      status,
      ...overrides,
    });

    await repository.create(application, USER_ID);
    await repository.place({
      applicationId: application.id,
      userId: USER_ID,
      status,
      position,
    });

    return application;
  }

  it('devolve as quatro colunas na ordem fixa', async () => {
    const board = await useCase.execute({ userId: USER_ID });

    expect(board.columns.map((column) => column.status)).toEqual([
      ApplicationStatus.PENDING,
      ApplicationStatus.IN_PROGRESS,
      ApplicationStatus.COMPLETED,
      ApplicationStatus.REJECTED,
    ]);
  });

  it('ordena os cards por posição dentro da coluna', async () => {
    await seed('Terceira', ApplicationStatus.PENDING, 3000);
    await seed('Primeira', ApplicationStatus.PENDING, 1000);
    await seed('Segunda', ApplicationStatus.PENDING, 2000);

    const board = await useCase.execute({ userId: USER_ID });
    const pending = board.columns.find(
      (column) => column.status === ApplicationStatus.PENDING,
    );

    expect(pending?.items.map((item) => item.title)).toEqual([
      'Primeira',
      'Segunda',
      'Terceira',
    ]);
  });

  it('informa o total por coluna', async () => {
    await seed('A', ApplicationStatus.PENDING, 1000);
    await seed('B', ApplicationStatus.PENDING, 2000);
    await seed('C', ApplicationStatus.COMPLETED, 1000);

    const board = await useCase.execute({ userId: USER_ID });

    expect(
      board.columns.map((column) => [column.status, column.total]),
    ).toEqual([
      [ApplicationStatus.PENDING, 2],
      [ApplicationStatus.IN_PROGRESS, 0],
      [ApplicationStatus.COMPLETED, 1],
      [ApplicationStatus.REJECTED, 0],
    ]);
  });

  it('sinaliza hasMore quando a coluna atinge o limite', async () => {
    await seed('A', ApplicationStatus.PENDING, 1000);
    await seed('B', ApplicationStatus.PENDING, 2000);

    const board = await useCase.execute({
      userId: USER_ID,
      limitPerColumn: 2,
    });
    const pending = board.columns.find(
      (column) => column.status === ApplicationStatus.PENDING,
    );

    expect(pending?.hasMore).toBe(true);
    expect(pending?.items).toHaveLength(2);
  });

  it('filtra por busca sem alterar o total da coluna', async () => {
    await seed('Backend Engineer', ApplicationStatus.PENDING, 1000, {
      company: 'Nubank',
    });
    await seed('Frontend Engineer', ApplicationStatus.PENDING, 2000, {
      company: 'Stone',
    });

    const board = await useCase.execute({
      userId: USER_ID,
      search: 'nubank',
    });
    const pending = board.columns.find(
      (column) => column.status === ApplicationStatus.PENDING,
    );

    expect(pending?.items).toHaveLength(1);
    expect(pending?.items[0]?.title).toBe('Backend Engineer');
    expect(pending?.total).toBe(2);
  });

  it('não devolve candidaturas de outro usuário', async () => {
    const application = makeRestoredApplication({
      status: ApplicationStatus.PENDING,
    });

    await repository.create(application, 'outro-usuario');

    const board = await useCase.execute({ userId: USER_ID });

    expect(board.columns.every((column) => column.items.length === 0)).toBe(
      true,
    );
  });
});
