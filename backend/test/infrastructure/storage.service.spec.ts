import type { ConfigService } from '@nestjs/config';
import type { S3Client } from '@aws-sdk/client-s3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../../src/infrastructure/storage/storage.service';

function createService(send: ReturnType<typeof vi.fn>) {
  const client = { send } as unknown as S3Client;
  const config = { get: () => 'trampo-files' } as unknown as ConfigService;

  return new StorageService(client, config);
}

describe('StorageService', () => {
  let send: ReturnType<typeof vi.fn>;
  let service: StorageService;

  beforeEach(() => {
    send = vi.fn();
    service = createService(send);
  });

  it('não cria o bucket quando ele já existe', async () => {
    send.mockResolvedValue({});

    await service.ensureBucket();

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0]).toHaveProperty(
      'input.Bucket',
      'trampo-files',
    );
  });

  it('cria o bucket quando o head responde 404', async () => {
    send
      .mockRejectedValueOnce({
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 },
      })
      .mockResolvedValueOnce({});

    await service.ensureBucket();

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('desiste após cinco tentativas quando o storage está fora', async () => {
    vi.useFakeTimers();
    send.mockRejectedValue(new Error('offline'));

    const promise = service.ensureBucket();

    await vi.runAllTimersAsync();
    await promise;

    expect(send).toHaveBeenCalledTimes(5);
    vi.useRealTimers();
  });

  it('envia o objeto com tipo e conteúdo', async () => {
    send.mockResolvedValue({});

    const body = Buffer.from('curriculo');

    await service.putObject('applications/a/b.pdf', body, 'application/pdf');

    expect(send.mock.calls[0]?.[0]).toMatchObject({
      input: {
        Bucket: 'trampo-files',
        Key: 'applications/a/b.pdf',
        Body: body,
        ContentType: 'application/pdf',
      },
    });
  });

  it('devolve o stream no download', async () => {
    const stream = { pipe: vi.fn() };
    send.mockResolvedValue({ Body: stream });

    await expect(service.getObject('key')).resolves.toBe(stream);
  });

  it('remove o objeto', async () => {
    send.mockResolvedValue({});

    await service.removeObject('key');

    expect(send.mock.calls[0]?.[0]).toHaveProperty('input.Key', 'key');
  });

  it('devolve tamanho e content type do stat', async () => {
    send.mockResolvedValue({ ContentLength: 1024, ContentType: 'text/plain' });

    await expect(service.statObject('key')).resolves.toEqual({
      size: 1024,
      contentType: 'text/plain',
    });
  });

  it('trata stat sem metadados', async () => {
    send.mockResolvedValue({});

    await expect(service.statObject('key')).resolves.toEqual({
      size: 0,
      contentType: '',
    });
  });
});
