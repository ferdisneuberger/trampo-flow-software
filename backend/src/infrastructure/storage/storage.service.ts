import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import type { Readable } from 'node:stream';

export const STORAGE_CLIENT = 'STORAGE_CLIENT';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;

  constructor(
    private readonly client: Client,
    configService: ConfigService,
  ) {
    this.bucket = configService.get<string>('S3_BUCKET') ?? 'trampo-files';
  }

  onModuleInit(): void {
    void this.ensureBucket();
  }

  async ensureBucket(): Promise<void> {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        const exists = await this.client.bucketExists(this.bucket);

        if (!exists) {
          await this.client.makeBucket(this.bucket);
          this.logger.log(`Bucket "${this.bucket}" criado.`);
        }

        return;
      } catch (error) {
        if (attempt === 5) {
          this.logger.warn(
            `Não foi possível preparar o bucket "${this.bucket}": ${
              error instanceof Error ? error.message : 'erro desconhecido'
            }`,
          );

          return;
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.putObject(this.bucket, key, body, body.length, {
      'Content-Type': contentType,
    });
  }

  async getObject(key: string): Promise<Readable> {
    return this.client.getObject(this.bucket, key);
  }

  async removeObject(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  async statObject(
    key: string,
  ): Promise<{ size: number; contentType: string }> {
    const stat = await this.client.statObject(this.bucket, key);
    const metadata = stat.metaData as Record<string, string | undefined>;

    return {
      size: stat.size,
      contentType: metadata['content-type'] ?? '',
    };
  }
}
