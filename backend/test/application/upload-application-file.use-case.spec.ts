import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_FILES_PER_APPLICATION,
  UploadApplicationFileUseCase,
} from '../../src/application/applications/use-cases/upload-application-file.use-case';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { FakeStorageService } from '../helpers/fake-storage.service';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import { makeRestoredApplication } from '../factories/application.factory';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

function pdfBuffer(): Buffer {
  return Buffer.from('%PDF-1.4\nconteudo');
}

function txtBuffer(): Buffer {
  return Buffer.from('carta de apresentacao');
}

describe('UploadApplicationFileUseCase', () => {
  let repository: InMemoryApplicationRepository;
  let storage: FakeStorageService;
  let useCase: UploadApplicationFileUseCase;

  beforeEach(() => {
    repository = new InMemoryApplicationRepository();
    storage = new FakeStorageService();
    useCase = new UploadApplicationFileUseCase(repository, storage.asService());
  });

  async function seed(files = 0) {
    const application = makeRestoredApplication({
      status: ApplicationStatus.PENDING,
    });

    for (let index = 0; index < files; index += 1) {
      application.addFiles([
        {
          name: `arquivo-${index}.pdf`,
          url: 'https://example.com/files/arquivo.pdf',
          mimeType: 'application/pdf',
          sizeInBytes: 100,
        },
      ]);
    }

    await repository.create(application, USER_ID);

    return application;
  }

  it('grava o PDF no storage e persiste os metadados', async () => {
    const application = await seed();
    const buffer = pdfBuffer();

    const updated = await useCase.execute({
      userId: USER_ID,
      applicationId: application.id,
      filename: 'curriculo.pdf',
      buffer,
    });

    const [file] = updated.files;

    expect(file?.storageKey).toMatch(
      new RegExp(`^applications/${application.id}/.+\\.pdf$`),
    );
    expect(file?.legacyUrl).toBeNull();
    expect(file?.mimeType).toBe('application/pdf');
    expect(file?.sizeInBytes).toBe(buffer.length);
    expect(file?.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(storage.objects.get(file?.storageKey ?? '')).toEqual(buffer);
  });

  it('aceita TXT e grava com o tipo detectado', async () => {
    const application = await seed();

    const updated = await useCase.execute({
      userId: USER_ID,
      applicationId: application.id,
      filename: 'carta.txt',
      buffer: txtBuffer(),
    });

    expect(updated.files[0]?.mimeType).toBe('text/plain');
  });

  it('recusa PDF com conteúdo que não é PDF', async () => {
    const application = await seed();

    await expect(
      useCase.execute({
        userId: USER_ID,
        applicationId: application.id,
        filename: 'falso.pdf',
        buffer: Buffer.from('<html>nao e pdf</html>'),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_FILE_CONTENT' });
    expect(storage.objects.size).toBe(0);
  });

  it('recusa extensão diferente de pdf ou txt', async () => {
    const application = await seed();

    await expect(
      useCase.execute({
        userId: USER_ID,
        applicationId: application.id,
        filename: 'video.mp4',
        buffer: Buffer.from('conteudo'),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_FILE_TYPE' });
  });

  it('recusa arquivo acima de 5 MB', async () => {
    const application = await seed();
    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 'a');

    await expect(
      useCase.execute({
        userId: USER_ID,
        applicationId: application.id,
        filename: 'grande.txt',
        buffer: big,
      }),
    ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('recusa arquivo vazio', async () => {
    const application = await seed();

    await expect(
      useCase.execute({
        userId: USER_ID,
        applicationId: application.id,
        filename: 'vazio.txt',
        buffer: Buffer.alloc(0),
      }),
    ).rejects.toMatchObject({ code: 'EMPTY_FILE' });
  });

  it('recusa o quarto arquivo', async () => {
    const application = await seed(MAX_FILES_PER_APPLICATION);

    await expect(
      useCase.execute({
        userId: USER_ID,
        applicationId: application.id,
        filename: 'extra.pdf',
        buffer: pdfBuffer(),
      }),
    ).rejects.toMatchObject({ code: 'FILE_LIMIT_REACHED' });
  });

  it('recusa candidatura de outro usuário', async () => {
    const application = await seed();

    await expect(
      useCase.execute({
        userId: 'outro-usuario',
        applicationId: application.id,
        filename: 'curriculo.pdf',
        buffer: pdfBuffer(),
      }),
    ).rejects.toMatchObject({ code: 'APPLICATION_NOT_FOUND' });
  });

  it('remove o objeto quando a persistência falha', async () => {
    const application = await seed();

    repository.update = async () => {
      throw new Error('falha no banco');
    };

    await expect(
      useCase.execute({
        userId: USER_ID,
        applicationId: application.id,
        filename: 'curriculo.pdf',
        buffer: pdfBuffer(),
      }),
    ).rejects.toThrow('falha no banco');

    expect(storage.objects.size).toBe(0);
  });
});
