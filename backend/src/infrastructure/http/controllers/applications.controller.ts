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
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
import { APPLICATION_DELETE_MODES } from '../../../application/applications/types/application-delete-mode';
import { CreateApplicationFileInput } from '../../../domain/applications/entities/application-file.entity';
import type { AuthenticatedRequest } from '../../auth/jwt-auth.guard';
import {
  ApplicationHttpResponse,
  ApplicationPresenter,
} from '../presenters/application.presenter';
import { ErrorResponse } from '../schemas/http.schemas';

@ApiTags('applications')
@ApiBearerAuth('bearer')
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
  @ApiOperation({ summary: 'Cria uma candidatura' })
  @ApiCreatedResponse({ type: ApplicationHttpResponse })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos.',
    type: ErrorResponse,
  })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  async create(
    @Body() dto: CreateApplicationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const application = await this.createApplicationUseCase.execute({
      userId: ApplicationsController.requireUserId(request),
      title: dto.title,
      link: dto.link,
      currentPhase: dto.currentPhase,
      status: dto.status,
      files: dto.files?.map((file) => ApplicationsController.toFileInput(file)),
    });

    return ApplicationPresenter.toHTTP(application);
  }

  @Get()
  @ApiOperation({ summary: 'Lista as candidaturas ativas' })
  @ApiOkResponse({ type: [ApplicationHttpResponse] })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  async list(@Req() request: AuthenticatedRequest) {
    const applications = await this.listApplicationsUseCase.execute(
      ApplicationsController.requireUserId(request),
    );

    return applications.map((application) =>
      ApplicationPresenter.toHTTP(application),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma candidatura' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ApplicationHttpResponse })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou nenhum campo informado.',
    type: ErrorResponse,
  })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  @ApiResponse({
    status: 404,
    description: 'Candidatura não encontrada.',
    type: ErrorResponse,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const application = await this.updateApplicationUseCase.execute({
      userId: ApplicationsController.requireUserId(request),
      id,
      title: dto.title,
      link: dto.link,
      currentPhase: dto.currentPhase,
      status: dto.status,
    });

    return ApplicationPresenter.toHTTP(application);
  }

  @Post(':id/files')
  @ApiOperation({ summary: 'Anexa arquivos a uma candidatura' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: AddApplicationFilesDto })
  @ApiOkResponse({ type: ApplicationHttpResponse })
  @ApiResponse({
    status: 400,
    description: 'Arquivo inválido ou lista vazia.',
    type: ErrorResponse,
  })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  @ApiResponse({
    status: 404,
    description: 'Candidatura não encontrada.',
    type: ErrorResponse,
  })
  async addFiles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddApplicationFilesDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const application = await this.addApplicationFilesUseCase.execute({
      userId: ApplicationsController.requireUserId(request),
      applicationId: id,
      files: dto.files.map((file) => ApplicationsController.toFileInput(file)),
    });

    return ApplicationPresenter.toHTTP(application);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Exclui uma candidatura (lógica por padrão, física com mode=hard)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: APPLICATION_DELETE_MODES,
  })
  @ApiNoContentResponse({ description: 'Candidatura excluída.' })
  @ApiResponse({
    status: 400,
    description: 'Modo inválido ou candidatura já excluída.',
    type: ErrorResponse,
  })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  @ApiResponse({
    status: 404,
    description: 'Candidatura não encontrada.',
    type: ErrorResponse,
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DeleteApplicationQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.deleteApplicationUseCase.execute({
      userId: ApplicationsController.requireUserId(request),
      id,
      mode: query.mode,
    });
  }

  private static requireUserId(request: AuthenticatedRequest): string {
    const userId = request.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }

    return userId;
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
