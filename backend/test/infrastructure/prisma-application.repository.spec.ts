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

function restoreWithFiles(
  application: Application,
  files: ApplicationFile[],
): Application {
  return Application.restore({
    id: application.id,
    title: application.title,
    link: application.link,
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

    await repository.create(application);
    const stored = await repository.findById(application.id);

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
    );

    expect(stored).toBeNull();
  });

  it('não devolve candidaturas excluídas logicamente por padrão', async () => {
    const active = makeApplication({ title: 'Ativa' });
    const deleted = makeApplication({ title: 'Excluída' });

    deleted.softDelete();

    await repository.create(active);
    await repository.create(deleted);

    const visible = await repository.findAll();
    const all = await repository.findAll({ includeDeleted: true });

    expect(visible.map((item) => item.title)).toEqual(['Ativa']);
    expect(all).toHaveLength(2);
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

    await repository.create(older);
    await repository.create(newer);

    const stored = await repository.findAll();

    expect(stored.map((item) => item.title)).toEqual(['Recente', 'Antiga']);
  });

  it('adiciona arquivos no update sem duplicar os existentes', async () => {
    const application = makeApplication({
      files: [makeApplicationFile({ name: 'curriculo.pdf' })],
    });

    await repository.create(application);

    const withNewFile = restoreWithFiles(application, [
      ...application.files,
      makeApplicationFile({ name: 'portfolio.pdf' }),
    ]);

    await repository.update(withNewFile);

    const stored = await repository.findById(application.id);

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

    await repository.create(application);

    const remaining = application.files.filter(
      (file) => file.name === 'curriculo.pdf',
    );

    await repository.update(restoreWithFiles(application, remaining));

    const stored = await repository.findById(application.id);

    expect(stored?.files.map((file) => file.name)).toEqual(['curriculo.pdf']);
    expect(await prisma.applicationFile.count()).toBe(1);
  });

  it('propaga o erro quando a candidatura não existe', async () => {
    const missing = makeRestoredApplication();

    await expect(repository.update(missing)).rejects.toThrow();
  });

  it('remove fisicamente a candidatura e seus arquivos', async () => {
    const application = makeApplication({
      files: [makeApplicationFile()],
    });

    await repository.create(application);
    await repository.delete(application);

    expect(await repository.findById(application.id)).toBeNull();
    expect(await prisma.application.count()).toBe(0);
    expect(await prisma.applicationFile.count()).toBe(0);
  });

  it('preserva createdAt ao atualizar e altera updatedAt', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const application = makeRestoredApplication({
      createdAt,
      updatedAt: createdAt,
    });

    await repository.create(application);

    const updated = restoreWithFiles(application, []);
    updated.updateDetails({ currentPhase: 'Entrevista final' });

    await repository.update(updated);
    const stored = await repository.findById(application.id);

    expect(stored?.currentPhase).toBe('Entrevista final');
    expect(stored?.createdAt).toEqual(createdAt);
    expect(stored?.updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
  });
});
