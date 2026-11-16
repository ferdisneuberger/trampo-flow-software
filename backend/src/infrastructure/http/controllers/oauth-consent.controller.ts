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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OAuthError } from '../../../application/oauth/errors/oauth.error';
import { DecideAuthorizationUseCase } from '../../../application/oauth/use-cases/decide-authorization.use-case';
import { ListOAuthGrantsUseCase } from '../../../application/oauth/use-cases/list-oauth-grants.use-case';
import { PreviewAuthorizationUseCase } from '../../../application/oauth/use-cases/preview-authorization.use-case';
import { RevokeOAuthGrantUseCase } from '../../../application/oauth/use-cases/revoke-oauth-grant.use-case';
import { CurrentUserId } from '../../auth/current-user-id.decorator';
import { OAuthRoute } from '../../auth/oauth-route.decorator';
import { RateLimiterService } from '../../auth/rate-limiter.service';
import { SessionOnly } from '../../auth/session-only.decorator';

const MINUTE_IN_MS = 60 * 1000;

/**
 * Consentimento e gestão de aplicativos conectados. Só com o JWT de sessão em
 * `Authorization` (não cookie): sem CSRF, e nem `tfp_` nem `tfo_` chegam aqui.
 */
@ApiTags('oauth')
@ApiBearerAuth('bearer')
@OAuthRoute()
@SessionOnly()
@Controller('oauth')
export class OAuthConsentController {
  constructor(
    private readonly previewAuthorization: PreviewAuthorizationUseCase,
    private readonly decideAuthorization: DecideAuthorizationUseCase,
    private readonly listGrants: ListOAuthGrantsUseCase,
    private readonly revokeGrant: RevokeOAuthGrantUseCase,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  @Get('authorize/preview')
  @ApiOperation({ summary: 'Valida o pedido e descreve o que será autorizado' })
  preview(@Query() query: Record<string, unknown>) {
    return this.previewAuthorization.execute(query);
  }

  @Post('authorize/decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprova ou nega; devolve a URL de retorno' })
  decision(
    @Body() body: Record<string, unknown>,
    @CurrentUserId() userId: string,
  ) {
    this.rateLimiter.consume(`oauth:decision:user:${userId}`, 30, MINUTE_IN_MS);

    const { approve, ...params } = body ?? {};

    if (typeof approve !== 'boolean') {
      throw new OAuthError('invalid_request', 'approve deve ser booleano.');
    }

    return this.decideAuthorization.execute({ userId, params, approve });
  }

  @Get('grants')
  @ApiOperation({ summary: 'Aplicativos conectados à conta' })
  async grants(@CurrentUserId() userId: string) {
    const grants = await this.listGrants.execute(userId);

    return grants.map((grant) => ({
      id: grant.id,
      clientName: grant.clientName,
      scopes: grant.scopes,
      createdAt: grant.createdAt.toISOString(),
      lastUsedAt: grant.lastUsedAt?.toISOString() ?? null,
    }));
  }

  @Delete('grants/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoga um aplicativo conectado' })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    await this.revokeGrant.execute({ userId, grantId: id });
  }
}
