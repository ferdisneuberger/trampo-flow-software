import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AddApplicationFilesDto } from '../../../application/applications/dtos/add-application-files.dto';
import {
  CreateApplicationDto,
  CreateApplicationFileDto,
} from '../../../application/applications/dtos/create-application.dto';
import { DeleteApplicationQueryDto } from '../../../application/applications/dtos/delete-application-query.dto';
import { UpdateApplicationDto } from '../../../application/applications/dtos/update-application.dto';
import { AddApplicationFilesUseCase } from '../../../application/applications/use-cases/add-application-files.use-case';
import { CreateApplicationUseCase } from '../../../application/applications/use-cases/create-application.use-case';
import { DeleteApplicationUseCase } from '../../../application/applications/use-cases/delete-application.use-case';
import { ListApplicationsUseCase } from '../../../application/applications/use-cases/list-applications.use-case';
import { UpdateApplicationUseCase } from '../../../application/applications/use-cases/update-application.use-case';
import { CreateApplicationFileInput } from '../../../domain/applications/entities/application-file.entity';
import { ApplicationPresenter } from '../presenters/application.presenter';

@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly createApplicationUseCase: CreateApplicationUseCase,
    private readonly listApplicationsUseCase: ListApplicationsUseCase,
    private readonly updateApplicationUseCase: UpdateApplicationUseCase,
    private readonly deleteApplicationUseCase: DeleteApplicationUseCase,
    private readonly addApplicationFilesUseCase: AddApplicationFilesUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateApplicationDto) {
    const application = await this.createApplicationUseCase.execute({
      title: dto.title,
      link: dto.link,
      currentPhase: dto.currentPhase,
      status: dto.status,
      files: dto.files?.map((file) => ApplicationsController.toFileInput(file)),
    });

    return ApplicationPresenter.toHTTP(application);
  }

  @Get()
  async list() {
    const applications = await this.listApplicationsUseCase.execute();

    return applications.map((application) =>
      ApplicationPresenter.toHTTP(application),
    );
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    const application = await this.updateApplicationUseCase.execute({
      id,
      title: dto.title,
      link: dto.link,
      currentPhase: dto.currentPhase,
      status: dto.status,
    });

    return ApplicationPresenter.toHTTP(application);
  }

  @Post(':id/files')
  async addFiles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddApplicationFilesDto,
  ) {
    const application = await this.addApplicationFilesUseCase.execute({
      applicationId: id,
      files: dto.files.map((file) => ApplicationsController.toFileInput(file)),
    });

    return ApplicationPresenter.toHTTP(application);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DeleteApplicationQueryDto,
  ): Promise<void> {
    await this.deleteApplicationUseCase.execute({
      id,
      mode: query.mode,
    });
  }

  private static toFileInput(
    file: CreateApplicationFileDto,
  ): CreateApplicationFileInput {
    return {
      name: file.name,
      url: file.url,
      mimeType: file.mimeType,
      sizeInBytes: file.sizeInBytes,
      uploadedAt: file.uploadedAt ? new Date(file.uploadedAt) : undefined,
    };
  }
}
