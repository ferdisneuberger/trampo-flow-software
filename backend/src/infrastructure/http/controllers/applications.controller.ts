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
import { CurrentUserId } from '../../auth/current-user-id.decorator';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateApplicationDto } from '../../../application/applications/dtos/create-application.dto';
import { DeleteApplicationQueryDto } from '../../../application/applications/dtos/delete-application-query.dto';
import { BoardQueryDto } from '../../../application/applications/dtos/board-query.dto';
import { ListApplicationsQueryDto } from '../../../application/applications/dtos/list-applications-query.dto';
import { PlaceApplicationDto } from '../../../application/applications/dtos/place-application.dto';
import { UpdateApplicationDto } from '../../../application/applications/dtos/update-application.dto';
import { CreateApplicationUseCase } from '../../../application/applications/use-cases/create-application.use-case';
import { DeleteApplicationUseCase } from '../../../application/applications/use-cases/delete-application.use-case';
import { GetApplicationStatsUseCase } from '../../../application/applications/use-cases/get-application-stats.use-case';
import { GetApplicationUseCase } from '../../../application/applications/use-cases/get-application.use-case';
import { GetBoardUseCase } from '../../../application/applications/use-cases/get-board.use-case';
import { ListApplicationsUseCase } from '../../../application/applications/use-cases/list-applications.use-case';
import { PlaceApplicationUseCase } from '../../../application/applications/use-cases/place-application.use-case';
import {
  decodeCursorPayload,
  encodeCursor,
} from '../../../application/applications/types/application-cursor';
import { UpdateApplicationUseCase } from '../../../application/applications/use-cases/update-application.use-case';
import { APPLICATION_DELETE_MODES } from '../../../application/applications/types/application-delete-mode';
import {
  ApplicationHttpResponse,
  ApplicationPresenter,
} from '../presenters/application.presenter';
import {
  ApplicationStatsResponse,
  BoardResponse,
  ErrorResponse,
  PaginatedApplicationsResponse,
} from '../schemas/http.schemas';

@ApiTags('applications')
@ApiBearerAuth('bearer')
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly createApplicationUseCase: CreateApplicationUseCase,
    private readonly listApplicationsUseCase: ListApplicationsUseCase,
    private readonly getApplicationStatsUseCase: GetApplicationStatsUseCase,
    private readonly getBoardUseCase: GetBoardUseCase,
    private readonly getApplicationUseCase: GetApplicationUseCase,
    private readonly updateApplicationUseCase: UpdateApplicationUseCase,
    private readonly placeApplicationUseCase: PlaceApplicationUseCase,
    private readonly deleteApplicationUseCase: DeleteApplicationUseCase,
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
    @CurrentUserId() userId: string,
  ) {
    const application = await this.createApplicationUseCase.execute({
      userId,
      title: dto.title,
      link: dto.link,
      company: dto.company,
      companyUrl: dto.companyUrl ?? null,
      currentPhase: dto.currentPhase,
      status: dto.status,
    });

    return ApplicationPresenter.toHTTP(application);
  }

  @Get()
  @ApiOperation({ summary: 'Lista as candidaturas com busca e paginação' })
  @ApiOkResponse({ type: PaginatedApplicationsResponse })
  @ApiResponse({
    status: 400,
    description: 'Cursor inválido.',
    type: ErrorResponse,
  })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  async list(
    @CurrentUserId() userId: string,
    @Query() query: ListApplicationsQueryDto,
  ) {
    const cursor = query.cursor
      ? decodeCursorPayload(query.cursor, query.sort ?? 'recent')
      : undefined;

    const result = await this.listApplicationsUseCase.execute({
      userId,
      limit: query.limit,
      sort: query.sort,
      search: query.search,
      status: query.status,
      cursor,
    });

    return {
      items: result.items.map((application) =>
        ApplicationPresenter.toHTTP(application),
      ),
      nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
      hasMore: result.nextCursor !== null,
    };
  }

  @Get('board')
  @ApiOperation({
    summary: 'Devolve as colunas do quadro, ordenadas por posição',
  })
  @ApiOkResponse({ type: BoardResponse })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  async board(@CurrentUserId() userId: string, @Query() query: BoardQueryDto) {
    const board = await this.getBoardUseCase.execute({
      userId,
      limitPerColumn: query.limitPerColumn,
      search: query.search,
    });

    return {
      columns: board.columns.map((column) => ({
        status: column.status,
        total: column.total,
        items: column.items.map((application) =>
          ApplicationPresenter.toHTTP(application),
        ),
        hasMore: column.hasMore,
      })),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Contadores por status do usuário autenticado' })
  @ApiOkResponse({ type: ApplicationStatsResponse })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  stats(@CurrentUserId() userId: string) {
    return this.getApplicationStatsUseCase.execute(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Devolve uma candidatura pelo id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ApplicationHttpResponse })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  @ApiResponse({
    status: 404,
    description: 'Candidatura não encontrada.',
    type: ErrorResponse,
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
    const application = await this.getApplicationUseCase.execute({
      id,
      userId,
    });

    return ApplicationPresenter.toHTTP(application);
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
    @CurrentUserId() userId: string,
  ) {
    const application = await this.updateApplicationUseCase.execute({
      userId,
      id,
      title: dto.title,
      link: dto.link,
      company: dto.company,
      companyUrl: dto.companyUrl,
      currentPhase: dto.currentPhase,
      status: dto.status,
    });

    return ApplicationPresenter.toHTTP(application);
  }

  @Patch(':id/placement')
  @ApiOperation({ summary: 'Move a candidatura de coluna e/ou posição' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ApplicationHttpResponse })
  @ApiResponse({
    status: 400,
    description: 'Vizinho inválido para o status de destino.',
    type: ErrorResponse,
  })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  @ApiResponse({
    status: 404,
    description: 'Candidatura não encontrada.',
    type: ErrorResponse,
  })
  async place(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PlaceApplicationDto,
    @CurrentUserId() userId: string,
  ) {
    const application = await this.placeApplicationUseCase.execute({
      userId,
      applicationId: id,
      status: dto.status,
      beforeId: dto.beforeId,
      afterId: dto.afterId,
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
    @CurrentUserId() userId: string,
  ): Promise<void> {
    await this.deleteApplicationUseCase.execute({
      userId,
      id,
      mode: query.mode,
    });
  }
}
