import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePersonalAccessTokenDto } from '../../../application/auth/dtos/create-personal-access-token.dto';
import { CreatePersonalAccessTokenUseCase } from '../../../application/auth/use-cases/create-personal-access-token.use-case';
import { ListPersonalAccessTokensUseCase } from '../../../application/auth/use-cases/list-personal-access-tokens.use-case';
import { RevokePersonalAccessTokenUseCase } from '../../../application/auth/use-cases/revoke-personal-access-token.use-case';
import type { PersonalAccessToken } from '../../../domain/auth/entities/personal-access-token.entity';
import { CurrentUserId } from '../../auth/current-user-id.decorator';
import { RateLimiterService } from '../../auth/rate-limiter.service';
import { SessionOnly } from '../../auth/session-only.decorator';
import {
  CreatedPersonalAccessTokenResponse,
  ErrorResponse,
  PersonalAccessTokenResponse,
} from '../schemas/http.schemas';

const HOUR_IN_MS = 60 * 60 * 1000;

function toResponse(token: PersonalAccessToken): PersonalAccessTokenResponse {
  return {
    id: token.id,
    name: token.name,
    prefix: token.prefix,
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
    expiresAt: token.expiresAt.toISOString(),
    revokedAt: token.revokedAt?.toISOString() ?? null,
    createdAt: token.createdAt.toISOString(),
  };
}

@ApiTags('auth')
@ApiBearerAuth('bearer')
@SessionOnly()
@Controller('auth/tokens')
export class PersonalAccessTokensController {
  constructor(
    private readonly createToken: CreatePersonalAccessTokenUseCase,
    private readonly listTokens: ListPersonalAccessTokensUseCase,
    private readonly revokeToken: RevokePersonalAccessTokenUseCase,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Cria um token de integração (PAT) para agentes e scripts',
    description:
      'O segredo `tfp_...` aparece só nesta resposta; o servidor guarda apenas o hash. Exige o JWT de sessão: um PAT não cria outro PAT.',
  })
  @ApiCreatedResponse({ type: CreatedPersonalAccessTokenResponse })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou limite de tokens ativos.',
    type: ErrorResponse,
  })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  @ApiResponse({ status: 403, description: 'Chamado com um PAT.' })
  @ApiResponse({
    status: 429,
    description: 'Muitos tokens criados em pouco tempo.',
  })
  async create(
    @Body() dto: CreatePersonalAccessTokenDto,
    @CurrentUserId() userId: string,
  ): Promise<CreatedPersonalAccessTokenResponse> {
    this.rateLimiter.consume(`pat:create:user:${userId}`, 10, HOUR_IN_MS);

    const { token, secret } = await this.createToken.execute({
      userId,
      name: dto.name,
      expiresInDays: dto.expiresInDays,
    });

    return { ...toResponse(token), token: secret };
  }

  @Get()
  @ApiOperation({ summary: 'Lista os tokens de integração (sem o segredo)' })
  @ApiOkResponse({ type: [PersonalAccessTokenResponse] })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  @ApiResponse({ status: 403, description: 'Chamado com um PAT.' })
  async list(
    @CurrentUserId() userId: string,
  ): Promise<PersonalAccessTokenResponse[]> {
    const tokens = await this.listTokens.execute(userId);

    return tokens.map(toResponse);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoga um token de integração' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Token revogado.' })
  @ApiResponse({ status: 401, description: 'Token ausente ou inválido.' })
  @ApiResponse({ status: 403, description: 'Chamado com um PAT.' })
  @ApiResponse({
    status: 404,
    description: 'Token não encontrado.',
    type: ErrorResponse,
  })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    await this.revokeToken.execute({ userId, id });
  }
}
