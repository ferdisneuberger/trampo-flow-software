import { beforeEach, describe, expect, it } from 'vitest';
import { PlaceApplicationUseCase } from '../../src/application/applications/use-cases/place-application.use-case';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import { makeRestoredApplication } from '../factories/application.factory';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

describe('PlaceApplicationUseCase', () => {
  let repository: InMemoryApplicationRepository;
  let useCase: PlaceApplicationUseCase;

  beforeEach(() => {
    repository = new InMemoryApplicationRepository();
    useCase = new PlaceApplicationUseCase(repository);
  });

  async function seed(
    title: string,
    position: number,
    status: ApplicationStatus = ApplicationStatus.IN_PROGRESS,
  ) {
    const application = makeRestoredApplication({
      title,
      position,
      status,
      createdAt: new Date(Date.UTC(2026, 0, position / 1000)),
      updatedAt: new Date(Date.UTC(2026, 0, position / 1000)),
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

  it('coloca no fim da coluna quando não há vizinhos', async () => {
    await seed('A', 1000);
    const moving = await seed('B', 2000);

    const placed = await useCase.execute({
      userId: USER_ID,
      applicationId: moving.id,
      status: ApplicationStatus.IN_PROGRESS,
    });

    expect(placed.position).toBe(3000);
  });

  it('coloca depois do vizinho informado', async () => {
    const before = await seed('A', 1000);
    const moving = await seed('B', 500);

    const placed = await useCase.execute({
      userId: USER_ID,
      applicationId: moving.id,
      status: ApplicationStatus.IN_PROGRESS,
      beforeId: before.id,
    });

    expect(placed.position).toBe(2000);
  });

  it('coloca antes do vizinho informado', async () => {
    const after = await seed('A', 3000);
    const moving = await seed('B', 500);

    const placed = await useCase.execute({
      userId: USER_ID,
      applicationId: moving.id,
      status: ApplicationStatus.IN_PROGRESS,
      afterId: after.id,
    });

    expect(placed.position).toBe(2000);
  });

  it('calcula o ponto médio entre dois vizinhos', async () => {
    const before = await seed('A', 1000);
    const after = await seed('C', 3000);
    const moving = await seed('B', 500);

    const placed = await useCase.execute({
      userId: USER_ID,
      applicationId: moving.id,
      status: ApplicationStatus.IN_PROGRESS,
      beforeId: before.id,
      afterId: after.id,
    });

    expect(placed.position).toBe(2000);
  });

  it('reindexa a coluna quando o intervalo entre vizinhos acaba', async () => {
    const before = await seed('A', 1000);
    const after = await seed('C', 1001);
    const moving = await seed('B', 500);

    const placed = await useCase.execute({
      userId: USER_ID,
      applicationId: moving.id,
      status: ApplicationStatus.IN_PROGRESS,
      beforeId: before.id,
      afterId: after.id,
    });

    expect(placed.position).toBe(2500);

    const reloadedBefore = await repository.findById(before.id, USER_ID);
    const reloadedAfter = await repository.findById(after.id, USER_ID);

    expect(reloadedBefore?.position).toBe(2000);
    expect(reloadedAfter?.position).toBe(3000);
  });

  it('move para outra coluna e reposiciona no fim', async () => {
    await seed('A', 1000, ApplicationStatus.COMPLETED);
    const moving = await seed('B', 1000);

    const placed = await useCase.execute({
      userId: USER_ID,
      applicationId: moving.id,
      status: ApplicationStatus.COMPLETED,
    });

    expect(placed.status).toBe(ApplicationStatus.COMPLETED);
    expect(placed.position).toBe(2000);
  });

  it('recusa vizinho de outro status', async () => {
    const neighbor = await seed('A', 1000, ApplicationStatus.COMPLETED);
    const moving = await seed('B', 1000);

    await expect(
      useCase.execute({
        userId: USER_ID,
        applicationId: moving.id,
        status: ApplicationStatus.IN_PROGRESS,
        beforeId: neighbor.id,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PLACEMENT' });
  });

  it('recusa vizinho inexistente', async () => {
    const moving = await seed('B', 1000);

    await expect(
      useCase.execute({
        userId: USER_ID,
        applicationId: moving.id,
        status: ApplicationStatus.IN_PROGRESS,
        beforeId: '00000000-0000-0000-0000-000000000000',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_PLACEMENT' });
  });

  it('recusa candidatura de outro usuário', async () => {
    const moving = await seed('B', 1000);

    await expect(
      useCase.execute({
        userId: 'outro-usuario',
        applicationId: moving.id,
      }),
    ).rejects.toMatchObject({ code: 'APPLICATION_NOT_FOUND' });
  });

  it('recusa candidatura excluída', async () => {
    const moving = makeRestoredApplication({
      deletedAt: new Date('2026-02-01T00:00:00.000Z'),
    });

    await repository.create(moving, USER_ID);

    await expect(
      useCase.execute({
        userId: USER_ID,
        applicationId: moving.id,
      }),
    ).rejects.toMatchObject({ code: 'APPLICATION_ALREADY_DELETED' });
  });
});
