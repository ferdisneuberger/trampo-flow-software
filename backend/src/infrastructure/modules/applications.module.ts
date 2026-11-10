import { Module } from '@nestjs/common';
import { CreateApplicationUseCase } from '../../application/applications/use-cases/create-application.use-case';
import { DeleteApplicationUseCase } from '../../application/applications/use-cases/delete-application.use-case';
import { GetApplicationStatsUseCase } from '../../application/applications/use-cases/get-application-stats.use-case';
import { GetApplicationUseCase } from '../../application/applications/use-cases/get-application.use-case';
import { GetBoardUseCase } from '../../application/applications/use-cases/get-board.use-case';
import { ListApplicationsUseCase } from '../../application/applications/use-cases/list-applications.use-case';
import { PlaceApplicationUseCase } from '../../application/applications/use-cases/place-application.use-case';
import { PreviewJobPostingUseCase } from '../../application/applications/use-cases/preview-job-posting.use-case';
import { UpdateApplicationUseCase } from '../../application/applications/use-cases/update-application.use-case';
import { ApplicationRepository } from '../../domain/applications/repositories/application.repository';
import { JobPageFetcher } from '../../domain/applications/services/job-page-fetcher';
import { UserRepository } from '../../domain/users/repositories/user.repository';
import { RateLimiterService } from '../auth/rate-limiter.service';
import { PrismaApplicationRepository } from '../database/prisma/repositories/prisma-application.repository';
import { PrismaUserRepository } from '../database/prisma/repositories/prisma-user.repository';
import { ApplicationsController } from '../http/controllers/applications.controller';
import { SafeHttpJobPageFetcher } from '../http/job-page/safe-http-job-page-fetcher';

@Module({
  controllers: [ApplicationsController],
  providers: [
    CreateApplicationUseCase,
    GetApplicationStatsUseCase,
    GetApplicationUseCase,
    GetBoardUseCase,
    ListApplicationsUseCase,
    PlaceApplicationUseCase,
    UpdateApplicationUseCase,
    DeleteApplicationUseCase,
    PreviewJobPostingUseCase,
    RateLimiterService,
    {
      provide: JobPageFetcher,
      useFactory: () => new SafeHttpJobPageFetcher(),
    },
    {
      provide: ApplicationRepository,
      useClass: PrismaApplicationRepository,
    },
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
  ],
})
export class ApplicationsModule {}
