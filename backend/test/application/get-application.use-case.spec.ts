import { beforeEach, describe, expect, it } from 'vitest';
import { GetApplicationUseCase } from '../../src/application/applications/use-cases/get-application.use-case';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import { makeRestoredApplication } from '../factories/application.factory';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

describe('GetApplicationUseCase', () => {
  let repository: InMemoryApplicationRepository;
  let useCase: GetApplicationUseCase;

  beforeEach(() => {
    repository = new InMemoryApplicationRepository();
    useCase = new GetApplicationUseCase(repository);
  });

  it('devolve a candidatura do usuário', async () => {
    const application = makeRestoredApplication({ title: 'Minha' });

    await repository.create(application, USER_ID);

    const found = await useCase.execute({
      id: application.id,
      userId: USER_ID,
    });

    expect(found.id).toBe(application.id);
    expect(found.title).toBe('Minha');
  });

  it('recusa candidatura de outro usuário', async () => {
    const application = makeRestoredApplication();

    await repository.create(application, USER_ID);

    await expect(
      useCase.execute({ id: application.id, userId: 'outro-usuario' }),
    ).rejects.toMatchObject({ code: 'APPLICATION_NOT_FOUND' });
  });

  it('recusa id inexistente', async () => {
    await expect(
      useCase.execute({
        id: '00000000-0000-0000-0000-000000000000',
        userId: USER_ID,
      }),
    ).rejects.toMatchObject({ code: 'APPLICATION_NOT_FOUND' });
  });
});
