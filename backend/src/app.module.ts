import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { ApplicationsModule } from './infrastructure/modules/applications.module';
import { AuthModule } from './infrastructure/modules/auth.module';
import { HealthModule } from './infrastructure/modules/health.module';
import { StorageModule } from './infrastructure/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    StorageModule,
    AuthModule,
    HealthModule,
    ApplicationsModule,
  ],
})
export class AppModule {}
