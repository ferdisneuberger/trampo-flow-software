import { beforeEach, describe, expect, it } from 'vitest';
import { DownloadApplicationFileUseCase } from '../../src/application/applications/use-cases/download-application-file.use-case';
import { RemoveApplicationFileUseCase } from '../../src/application/applications/use-cases/remove-application-file.use-case';
import { UploadApplicationFileUseCase } from '../../src/application/applications/use-cases/upload-application-file.use-case';
import { FakeStorageService } from '../helpers/fake-storage.service';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import {
  makeApplicationFile,
  makeRestoredApplication,
} from '../factories/application.factory';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk as Buffer));
  }

  return Buffer.concat(chunks).toString('utf8');
}

describe('DownloadApplicationFileUseCase', () => {
  let repository: InMemoryApplicationRepository;
  let storage: FakeStorageService;
  let upload: UploadApplicationFileUseCase;
  let download: DownloadApplicationFileUseCase;
  let remove: RemoveApplicationFileUseCase;

  beforeEach(() => {
    repository = new InMemoryApplicationRepository();
    storage = new FakeStorageService();
    upload = new UploadApplicationFileUseCase(repository, storage.asService());
    download = new DownloadApplicationFileUseCase(
      repository,
      storage.asService(),
    );
    remove = new RemoveApplicationFileUseCase(repository, storage.asService());
  });

  async function seedUploaded() {
    const application = makeRestoredApplication();

    await repository.create(application, USER_ID);

    const updated = await upload.execute({
      userId: USER_ID,
      applicationId: application.id,
      filename: 'carta.txt',
      buffer: Buffer.from('conteudo do arquivo'),
    });

    return { application: updated, file: updated.files[0] };
  }

  it('devolve o stream do arquivo armazenado', async () => {
    const { application, file } = await seedUploaded();

    const result = await download.execute({
      userId: USER_ID,
      applicationId: application.id,
      fileId: file.id,
    });

    await expect(streamToString(result.stream)).resolves.toBe(
      'conteudo do arquivo',
    );
    expect(result.file.name).toBe('carta.txt');
  });

  it('recusa arquivo de outro usuário', async () => {
    const { application, file } = await seedUploaded();

    await expect(
      download.execute({
        userId: 'outro-usuario',
        applicationId: application.id,
        fileId: file.id,
      }),
    ).rejects.toMatchObject({ code: 'APPLICATION_NOT_FOUND' });
  });

  it('recusa arquivo antigo que só tem URL externa', async () => {
    const application = makeRestoredApplication({
      files: [makeApplicationFile({ name: 'antigo.pdf' })],
    });

    await repository.create(application, USER_ID);

    await expect(
      download.execute({
        userId: USER_ID,
        applicationId: application.id,
        fileId: application.files[0].id,
      }),
    ).rejects.toMatchObject({ code: 'FILE_NOT_STORED' });
  });

  it('remove o arquivo do banco e do storage', async () => {
    const { application, file } = await seedUploaded();

    await remove.execute({
      userId: USER_ID,
      applicationId: application.id,
      fileId: file.id,
    });

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored?.files).toEqual([]);
    expect(storage.objects.size).toBe(0);
  });

  it('recusa remover arquivo inexistente', async () => {
    const application = makeRestoredApplication();

    await repository.create(application, USER_ID);

    await expect(
      remove.execute({
        userId: USER_ID,
        applicationId: application.id,
        fileId: '00000000-0000-0000-0000-000000000000',
      }),
    ).rejects.toMatchObject({ code: 'FILE_NOT_FOUND' });
  });
});
