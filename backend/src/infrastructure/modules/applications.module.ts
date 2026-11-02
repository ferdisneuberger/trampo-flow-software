import { Module } from '@nestjs/common';
import { AddApplicationFilesUseCase } from '../../application/applications/use-cases/add-application-files.use-case';
import { CreateApplicationUseCase } from '../../application/applications/use-cases/create-application.use-case';
import { DeleteApplicationUseCase } from '../../application/applications/use-cases/delete-application.use-case';
import { GetApplicationStatsUseCase } from '../../application/applications/use-cases/get-application-stats.use-case';
import { GetBoardUseCase } from '../../application/applications/use-cases/get-board.use-case';
import { ListApplicationsUseCase } from '../../application/applications/use-cases/list-applications.use-case';
import { PlaceApplicationUseCase } from '../../application/applications/use-cases/place-application.use-case';
import { UpdateApplicationUseCase } from '../../application/applications/use-cases/update-application.use-case';
import { ApplicationRepository } from '../../domain/applications/repositories/application.repository';
import { PrismaApplicationRepository } from '../database/prisma/repositories/prisma-application.repository';
import { ApplicationsController } from '../http/controllers/applications.controller';

@Module({
  controllers: [ApplicationsController],
  providers: [
    CreateApplicationUseCase,
    GetApplicationStatsUseCase,
    GetBoardUseCase,
    ListApplicationsUseCase,
    PlaceApplicationUseCase,
    UpdateApplicationUseCase,
    DeleteApplicationUseCase,
    AddApplicationFilesUseCase,
    {
      provide: ApplicationRepository,
      useClass: PrismaApplicationRepository,
    },
  ],
})
export class ApplicationsModule {}
