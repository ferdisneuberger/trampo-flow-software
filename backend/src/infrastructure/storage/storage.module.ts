import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { STORAGE_CLIENT, StorageService } from './storage.service';

function buildEndpoint(configService: ConfigService): string {
  const endpoint = configService.get<string>('S3_ENDPOINT') ?? 'localhost';
  const port = configService.get<string>('S3_PORT') ?? '9000';
  const scheme =
    configService.get<string>('S3_USE_SSL') === 'true' ? 'https' : 'http';

  return `${scheme}://${endpoint}:${port}`;
}

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new S3Client({
          endpoint: buildEndpoint(configService),
          region: configService.get<string>('S3_REGION') ?? 'us-east-1',
          forcePathStyle: true,
          credentials: {
            accessKeyId: configService.get<string>('S3_ACCESS_KEY') ?? '',
            secretAccessKey: configService.get<string>('S3_SECRET_KEY') ?? '',
          },
        }),
    },
    {
      provide: StorageService,
      inject: [STORAGE_CLIENT, ConfigService],
      useFactory: (client: S3Client, configService: ConfigService) =>
        new StorageService(client, configService),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
