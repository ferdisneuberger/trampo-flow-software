import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Application } from '../../src/domain/applications/entities/application.entity';
import { ApplicationFile } from '../../src/domain/applications/entities/application-file.entity';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import { PrismaApplicationRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-application.repository';
import {
  makeApplication,
  makeApplicationFile,
  makeRestoredApplication,
} from '../factories/application.factory';
import {
  createTestPrisma,
  TEST_DATABASE_URL,
  truncateApplicationData,
} from '../helpers/test-database';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';
const OTHER_USER_ID = 'b1e2d3c4-5f60-4a7b-8c9d-0e1f2a3b4c5d';
const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

async function seedUsers(prisma: PrismaService): Promise<void> {
  for (const [id, username] of [
    [USER_ID, 'repository-user'],
    [OTHER_USER_ID, 'repository-other-user'],
  ] as const) {
    const now = new Date();

    await prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        username,
        passwordHash: PASSWORD_HASH,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
}

function restoreWithFiles(
  application: Application,
  files: ApplicationFile[],
): Application {
  return Application.restore({
    id: application.id,
    title: application.title,
    link: application.link,
    company: application.company,
    companyUrl: application.companyUrl,
    position: application.position,
    status: application.status,
    currentPhase: application.currentPhase,
    files,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    deletedAt: application.deletedAt,
  });
}

describe.skipIf(!TEST_DATABASE_URL)('PrismaApplicationRepository', () => {
  let prisma: PrismaService;
  let repository: PrismaApplicationRepository;

  beforeAll(async () => {
    prisma = await createTestPrisma();
    await seedUsers(prisma);
    repository = new PrismaApplicationRepository(prisma);
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateApplicationData(prisma);
  });

  it('persiste e recupera a candidatura com arquivos', async () => {
    const application = makeApplication({
      status: ApplicationStatus.IN_PROGRESS,
      files: [makeApplicationFile({ name: 'curriculo.pdf' })],
    });

    await repository.create(application, USER_ID);
    const stored = await repository.findById(application.id, USER_ID);

    expect(stored).not.toBeNull();
    expect(stored?.id).toBe(application.id);
    expect(stored?.status).toBe(ApplicationStatus.IN_PROGRESS);
    expect(stored?.files).toHaveLength(1);
    expect(stored?.files[0]?.name).toBe('curriculo.pdf');
    expect(stored?.files[0]?.uploadedAt).toBeInstanceOf(Date);
  });

  it('devolve null para id inexistente', async () => {
    const stored = await repository.findById(
      '00000000-0000-0000-0000-000000000000',
      USER_ID,
    );

    expect(stored).toBeNull();
  });

  it('não devolve candidaturas excluídas logicamente por padrão', async () => {
    const active = makeApplication({ title: 'Ativa' });
    const deleted = makeApplication({ title: 'Excluída' });

    deleted.softDelete();

    await repository.create(active, USER_ID);
    await repository.create(deleted, USER_ID);

    const visible = await repository.findPage(USER_ID, {
      limit: 100,
      sort: 'recent',
    });

    expect(visible.map((item) => item.title)).toEqual(['Ativa']);
  });

  it('ordena a listagem da mais recente para a mais antiga', async () => {
    const older = makeRestoredApplication({
      title: 'Antiga',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const newer = makeRestoredApplication({
      title: 'Recente',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    });

    await repository.create(older, USER_ID);
    await repository.create(newer, USER_ID);

    const stored = await repository.findPage(USER_ID, {
      limit: 100,
      sort: 'recent',
    });

    expect(stored.map((item) => item.title)).toEqual(['Recente', 'Antiga']);
  });

  it('adiciona arquivos no update sem duplicar os existentes', async () => {
    const application = makeApplication({
      files: [makeApplicationFile({ name: 'curriculo.pdf' })],
    });

    await repository.create(application, USER_ID);

    const withNewFile = restoreWithFiles(application, [
      ...application.files,
      makeApplicationFile({ name: 'portfolio.pdf' }),
    ]);

    await repository.update(withNewFile, USER_ID);

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored?.files.map((file) => file.name).sort()).toEqual([
      'curriculo.pdf',
      'portfolio.pdf',
    ]);
    expect(await prisma.applicationFile.count()).toBe(2);
  });

  it('remove da tabela os arquivos que saíram da entidade', async () => {
    const application = makeApplication({
      files: [
        makeApplicationFile({ name: 'curriculo.pdf' }),
        makeApplicationFile({ name: 'portfolio.pdf' }),
      ],
    });

    await repository.create(application, USER_ID);

    const remaining = application.files.filter(
      (file) => file.name === 'curriculo.pdf',
    );

    await repository.update(restoreWithFiles(application, remaining), USER_ID);

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored?.files.map((file) => file.name)).toEqual(['curriculo.pdf']);
    expect(await prisma.applicationFile.count()).toBe(1);
  });

  it('propaga o erro quando a candidatura não existe', async () => {
    const missing = makeRestoredApplication();

    await expect(repository.update(missing, USER_ID)).rejects.toThrow();
  });

  it('remove fisicamente a candidatura e seus arquivos', async () => {
    const application = makeApplication({
      files: [makeApplicationFile()],
    });

    await repository.create(application, USER_ID);
    await repository.delete(application, USER_ID);

    expect(await repository.findById(application.id, USER_ID)).toBeNull();
    expect(await prisma.application.count()).toBe(0);
    expect(await prisma.applicationFile.count()).toBe(0);
  });

  it('preserva createdAt ao atualizar e altera updatedAt', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const application = makeRestoredApplication({
      createdAt,
      updatedAt: createdAt,
    });

    await repository.create(application, USER_ID);

    const updated = restoreWithFiles(application, []);
    updated.updateDetails({ currentPhase: 'Entrevista final' });

    await repository.update(updated, USER_ID);
    const stored = await repository.findById(application.id, USER_ID);

    expect(stored?.currentPhase).toBe('Entrevista final');
    expect(stored?.createdAt).toEqual(createdAt);
    expect(stored?.updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
  });

  it('não expõe nem altera candidaturas de outro usuário', async () => {
    const application = makeApplication();

    await repository.create(application, USER_ID);

    await expect(
      repository.findById(application.id, OTHER_USER_ID),
    ).resolves.toBeNull();
    await expect(
      repository.findPage(OTHER_USER_ID, { limit: 10, sort: 'recent' }),
    ).resolves.toEqual([]);
    await expect(
      repository.update(restoreWithFiles(application, []), OTHER_USER_ID),
    ).rejects.toThrow();
    await expect(
      repository.delete(application, OTHER_USER_ID),
    ).rejects.toThrow();
    await expect(
      repository.findById(application.id, USER_ID),
    ).resolves.not.toBeNull();
  });

  it('pagina por chave sem repetir itens', async () => {
    for (let index = 0; index < 5; index += 1) {
      const date = new Date(Date.UTC(2026, 0, index + 1));

      await repository.create(
        makeRestoredApplication({
          title: `Vaga ${index}`,
          createdAt: date,
          updatedAt: date,
        }),
        USER_ID,
      );
    }

    const first = await repository.findPage(USER_ID, {
      limit: 2,
      sort: 'recent',
    });
    const last = first.at(-1);
    const second = await repository.findPage(USER_ID, {
      limit: 2,
      sort: 'recent',
      cursor: { sort: 'recent', value: last!.createdAt, id: last!.id },
    });

    const ids = [...first, ...second].map((item) => item.id);

    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });

  it('busca por título, empresa e fase', async () => {
    await repository.create(
      makeRestoredApplication({ title: 'Backend', company: 'Nubank' }),
      USER_ID,
    );
    await repository.create(
      makeRestoredApplication({
        title: 'Frontend',
        company: 'Stone',
        currentPhase: 'Nubank',
      }),
      USER_ID,
    );
    await repository.create(
      makeRestoredApplication({ title: 'Dados', company: 'Itaú' }),
      USER_ID,
    );

    const result = await repository.findPage(USER_ID, {
      limit: 10,
      sort: 'recent',
      search: 'nubank',
    });

    expect(result).toHaveLength(2);
  });

  it('filtra por status', async () => {
    await repository.create(
      makeRestoredApplication({ status: ApplicationStatus.COMPLETED }),
      USER_ID,
    );
    await repository.create(
      makeRestoredApplication({ status: ApplicationStatus.PENDING }),
      USER_ID,
    );

    const result = await repository.findPage(USER_ID, {
      limit: 10,
      sort: 'recent',
      status: ApplicationStatus.COMPLETED,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe(ApplicationStatus.COMPLETED);
  });

  it('conta por status apenas as candidaturas do usuário', async () => {
    await repository.create(
      makeRestoredApplication({ status: ApplicationStatus.PENDING }),
      USER_ID,
    );
    await repository.create(
      makeRestoredApplication({ status: ApplicationStatus.IN_PROGRESS }),
      USER_ID,
    );
    await repository.create(
      makeRestoredApplication({ status: ApplicationStatus.PENDING }),
      OTHER_USER_ID,
    );

    const counts = await repository.countByStatus(USER_ID);

    expect(counts).toEqual({
      PENDING: 1,
      IN_PROGRESS: 1,
      COMPLETED: 0,
      REJECTED: 0,
    });
  });
});
