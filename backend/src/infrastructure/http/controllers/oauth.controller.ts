import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseFilters,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { OAuthError } from '../../../application/oauth/errors/oauth.error';
import { ExchangeAuthorizationCodeUseCase } from '../../../application/oauth/use-cases/exchange-authorization-code.use-case';
import { RefreshOAuthTokenUseCase } from '../../../application/oauth/use-cases/refresh-oauth-token.use-case';
import { RegisterOAuthClientUseCase } from '../../../application/oauth/use-cases/register-oauth-client.use-case';
import { RevokeOAuthTokenUseCase } from '../../../application/oauth/use-cases/revoke-oauth-token.use-case';
import { OAuthRoute } from '../../auth/oauth-route.decorator';
import { Public } from '../../auth/public.decorator';
import { RateLimiterService } from '../../auth/rate-limiter.service';
import { OAuthExceptionFilter } from '../filters/oauth-exception.filter';

const MINUTE_IN_MS = 60 * 1000;
const TOKEN_LIMIT = 30;
const REGISTER_LIMIT = 5;

type Params = Record<string, unknown>;

/** Lê um campo de texto do corpo (form ou JSON); repetido ou de outro tipo é inválido. */
function field(body: Params, name: string): string | undefined {
  const value = body?.[name];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new OAuthError('invalid_request', `Parâmetro ${name} inválido.`);
  }

  return value;
}

function required(body: Params, name: string): string {
  const value = field(body, name);

  if (!value) {
    throw new OAuthError('invalid_request', `Parâmetro ${name} ausente.`);
  }

  return value;
}

/**
 * Endpoints públicos do servidor de autorização (RFC 6749, 7591 e 7009).
 * Recebem `Record<string, unknown>` de propósito: o `ValidationPipe` global é
 * estrito, mas clientes OAuth enviam campos extras que devem ser tolerados.
 */
@ApiTags('oauth')
@OAuthRoute()
@Public()
@UseFilters(OAuthExceptionFilter)
@Controller('oauth')
export class OAuthController {
  constructor(
    private readonly registerClient: RegisterOAuthClientUseCase,
    private readonly exchangeCode: ExchangeAuthorizationCodeUseCase,
    private readonly refreshToken: RefreshOAuthTokenUseCase,
    private readonly revokeToken: RevokeOAuthTokenUseCase,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registro dinâmico de cliente público (RFC 7591)' })
  async register(@Body() body: Params, @Req() request: FastifyRequest) {
    this.rateLimiter.consume(
      `oauth:register:ip:${request.ip}`,
      REGISTER_LIMIT,
      MINUTE_IN_MS,
    );

    return this.registerClient.execute(body ?? {});
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  // RFC 6749 §5.1: a resposta com tokens nunca é guardada em cache.
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  @ApiOperation({
    summary: 'Troca de código ou refresh token por tokens (form-urlencoded)',
  })
  async token(@Body() body: Params, @Req() request: FastifyRequest) {
    const params = body ?? {};

    this.rateLimiter.consume(
      `oauth:token:ip:${request.ip}`,
      TOKEN_LIMIT,
      MINUTE_IN_MS,
    );

    const clientId = required(params, 'client_id');

    this.rateLimiter.consume(
      `oauth:token:client:${clientId}`,
      TOKEN_LIMIT,
      MINUTE_IN_MS,
    );

    const grantType = required(params, 'grant_type');

    if (grantType === 'authorization_code') {
      return this.exchangeCode.execute({
        code: required(params, 'code'),
        redirectUri: required(params, 'redirect_uri'),
        clientId,
        codeVerifier: required(params, 'code_verifier'),
        resource: field(params, 'resource'),
      });
    }

    if (grantType === 'refresh_token') {
      return this.refreshToken.execute({
        refreshToken: required(params, 'refresh_token'),
        clientId,
        scope: field(params, 'scope'),
        resource: field(params, 'resource'),
      });
    }

    throw new OAuthError(
      'unsupported_grant_type',
      'grant_type deve ser authorization_code ou refresh_token.',
    );
  }

  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revogação de token (RFC 7009); sempre 200' })
  async revoke(@Body() body: Params, @Req() request: FastifyRequest) {
    this.rateLimiter.consume(
      `oauth:token:ip:${request.ip}`,
      TOKEN_LIMIT,
      MINUTE_IN_MS,
    );

    await this.revokeToken.execute(required(body ?? {}, 'token'));
  }
}
