import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';

export const STORAGE_CLIENT = 'STORAGE_CLIENT';

function isNotFound(error: unknown): boolean {
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return (
    candidate.name === 'NotFound' ||
    candidate.name === 'NoSuchBucket' ||
    candidate.$metadata?.httpStatusCode === 404
  );
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;

  constructor(
    private readonly client: S3Client,
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
        await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));

        return;
      } catch (error) {
        if (isNotFound(error)) {
          try {
            await this.client.send(
              new CreateBucketCommand({ Bucket: this.bucket }),
            );
            this.logger.log(`Bucket "${this.bucket}" criado.`);

            return;
          } catch (createError) {
            if (attempt === 5) {
              this.logger.warn(
                `Não foi possível criar o bucket "${this.bucket}": ${this.describe(createError)}`,
              );

              return;
            }
          }
        } else if (attempt === 5) {
          this.logger.warn(
            `Não foi possível preparar o bucket "${this.bucket}": ${this.describe(error)}`,
          );

          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getObject(key: string): Promise<Readable> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    return response.Body as Readable;
  }

  async removeObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async statObject(
    key: string,
  ): Promise<{ size: number; contentType: string }> {
    const response = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    return {
      size: response.ContentLength ?? 0,
      contentType: response.ContentType ?? '',
    };
  }

  private describe(error: unknown): string {
    return error instanceof Error ? error.message : 'erro desconhecido';
  }
}
