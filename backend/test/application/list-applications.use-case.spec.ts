import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  ListApplicationsUseCase,
} from '../../src/application/applications/use-cases/list-applications.use-case';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import { makeRestoredApplication } from '../factories/application.factory';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

function makeAt(index: number, overrides = {}) {
  const date = new Date(Date.UTC(2026, 0, index + 1));

  return makeRestoredApplication({
    title: `Vaga ${index}`,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  });
}

describe('ListApplicationsUseCase', () => {
  let repository: InMemoryApplicationRepository;
  let useCase: ListApplicationsUseCase;

  beforeEach(() => {
    repository = new InMemoryApplicationRepository();
    useCase = new ListApplicationsUseCase(repository);
  });

  it('devolve página vazia quando não há candidaturas', async () => {
    await expect(useCase.execute({ userId: USER_ID })).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it('usa o tamanho padrão de página quando o limite não é informado', async () => {
    for (let index = 0; index < 3; index += 1) {
      await repository.create(makeAt(index), USER_ID);
    }

    const result = await useCase.execute({ userId: USER_ID });

    expect(DEFAULT_PAGE_SIZE).toBe(25);
    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
  });

  it('devolve cursor quando ainda há itens', async () => {
    for (let index = 0; index < 3; index += 1) {
      await repository.create(makeAt(index), USER_ID);
    }

    const firstPage = await useCase.execute({ userId: USER_ID, limit: 2 });

    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.nextCursor).toMatchObject({ sort: 'recent' });

    const secondPage = await useCase.execute({
      userId: USER_ID,
      limit: 2,
      cursor: firstPage.nextCursor ?? undefined,
    });

    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('percorre todas as páginas sem repetir ids', async () => {
    for (let index = 0; index < 5; index += 1) {
      await repository.create(makeAt(index), USER_ID);
    }

    const first = await useCase.execute({ userId: USER_ID, limit: 2 });
    const second = await useCase.execute({
      userId: USER_ID,
      limit: 2,
      cursor: first.nextCursor ?? undefined,
    });
    const third = await useCase.execute({
      userId: USER_ID,
      limit: 2,
      cursor: second.nextCursor ?? undefined,
    });

    const ids = [...first.items, ...second.items, ...third.items].map(
      (item) => item.id,
    );

    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    expect(third.nextCursor).toBeNull();
  });

  it('busca por título, empresa ou fase sem diferenciar maiúsculas', async () => {
    await repository.create(
      makeAt(1, { title: 'Backend Engineer', company: 'Nubank' }),
      USER_ID,
    );
    await repository.create(
      makeAt(2, {
        title: 'Frontend',
        company: 'Stone',
        currentPhase: 'Nubank',
      }),
      USER_ID,
    );
    await repository.create(
      makeAt(3, { title: 'Dados', company: 'Itaú' }),
      USER_ID,
    );

    const byCompany = await useCase.execute({
      userId: USER_ID,
      search: 'NUBANK',
    });

    expect(byCompany.items).toHaveLength(2);
  });

  it('filtra por status', async () => {
    await repository.create(
      makeAt(1, { status: ApplicationStatus.COMPLETED }),
      USER_ID,
    );
    await repository.create(
      makeAt(2, { status: ApplicationStatus.PENDING }),
      USER_ID,
    );

    const result = await useCase.execute({
      userId: USER_ID,
      status: ApplicationStatus.COMPLETED,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe(ApplicationStatus.COMPLETED);
  });

  it('ordena por atualização mais antiga quando sort é stale', async () => {
    const older = makeRestoredApplication({
      title: 'Parada',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const newer = makeRestoredApplication({
      title: 'Recente',
      updatedAt: new Date('2026-03-01T00:00:00.000Z'),
    });

    await repository.create(newer, USER_ID);
    await repository.create(older, USER_ID);

    const result = await useCase.execute({ userId: USER_ID, sort: 'stale' });

    expect(result.items.map((item) => item.title)).toEqual([
      'Parada',
      'Recente',
    ]);
  });

  it('não devolve candidaturas de outro usuário', async () => {
    await repository.create(makeAt(1, { title: 'Minha' }), USER_ID);
    await repository.create(makeAt(2, { title: 'De outro' }), 'outro-usuario');

    const result = await useCase.execute({ userId: USER_ID });

    expect(result.items.map((item) => item.title)).toEqual(['Minha']);
  });

  it('omite candidaturas excluídas logicamente', async () => {
    await repository.create(
      makeAt(1, {
        title: 'Excluída',
        deletedAt: new Date('2026-02-01T00:00:00.000Z'),
      }),
      USER_ID,
    );

    const result = await useCase.execute({ userId: USER_ID });

    expect(result.items).toEqual([]);
  });
});
