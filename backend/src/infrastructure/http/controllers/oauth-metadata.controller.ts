import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetAuthorizationServerMetadataUseCase } from '../../../application/oauth/use-cases/get-authorization-server-metadata.use-case';
import { OAuthRoute } from '../../auth/oauth-route.decorator';
import { Public } from '../../auth/public.decorator';

@ApiTags('oauth')
@OAuthRoute()
@Public()
@Controller('.well-known')
export class OAuthMetadataController {
  constructor(
    private readonly metadata: GetAuthorizationServerMetadataUseCase,
  ) {}

  @Get('oauth-authorization-server')
  @ApiOperation({ summary: 'Metadata do servidor de autorização (RFC 8414)' })
  @ApiOkResponse({ description: 'Endpoints, escopos e métodos suportados.' })
  authorizationServer(): Record<string, unknown> {
    return this.metadata.execute();
  }
}
