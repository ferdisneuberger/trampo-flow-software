import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { STORAGE_CLIENT, StorageService } from './storage.service';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Client({
          endPoint: configService.get<string>('S3_ENDPOINT') ?? 'localhost',
          port: Number(configService.get<string>('S3_PORT') ?? 9000),
          useSSL: configService.get<string>('S3_USE_SSL') === 'true',
          accessKey: configService.get<string>('S3_ACCESS_KEY') ?? '',
          secretKey: configService.get<string>('S3_SECRET_KEY') ?? '',
          region: configService.get<string>('S3_REGION') ?? 'us-east-1',
        }),
    },
    {
      provide: StorageService,
      inject: [STORAGE_CLIENT, ConfigService],
      useFactory: (client: Client, configService: ConfigService) =>
        new StorageService(client, configService),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
