import {
  Controller,
  Delete,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiHeader,
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { createHash, timingSafeEqual } from 'node:crypto';
import { DeleteUserByEmailUseCase } from '../../../application/auth/use-cases/delete-user-by-email.use-case';
import { Public } from '../../auth/public.decorator';
import { RateLimiterService } from '../../auth/rate-limiter.service';

@ApiTags('admin')
@Controller('admin')
export class AdminUsersController {
  private readonly apiKey: string;

  constructor(
    private readonly deleteUserByEmail: DeleteUserByEmailUseCase,
    private readonly rateLimiter: RateLimiterService,
    configService: ConfigService,
  ) {
    this.apiKey = configService.get<string>('API_KEY_DELETE')?.trim() ?? '';
  }

  @Public()
  @Delete('users/:email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui um usuário (rota de testes)' })
  @ApiParam({ name: 'email', example: 'pessoa@exemplo.com' })
  @ApiHeader({
    name: 'x-api-key',
    required: true,
    description: 'Chave definida em API_KEY_DELETE.',
  })
  @ApiNoContentResponse({ description: 'Usuário excluído.' })
  @ApiResponse({ status: 401, description: 'API key inválida.' })
  @ApiResponse({ status: 403, description: 'Rota desabilitada.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas.' })
  async deleteUser(
    @Param('email') email: string,
    @Headers('x-api-key') apiKey: string | undefined,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    this.rateLimiter.consume(
      `admin:delete-user:minute:${request.ip}`,
      10,
      60 * 1000,
    );
    this.rateLimiter.consume(
      `admin:delete-user:hour:${request.ip}`,
      30,
      60 * 60 * 1000,
    );

    this.assertAuthorized(apiKey);

    await this.deleteUserByEmail.execute({ email });
  }

  private assertAuthorized(apiKey: string | undefined): void {
    if (!this.apiKey) {
      throw new ForbiddenException({
        message: 'Rota administrativa desabilitada.',
        code: 'ADMIN_ROUTE_DISABLED',
      });
    }

    const expected = createHash('sha256').update(this.apiKey).digest();
    const provided = createHash('sha256')
      .update(apiKey ?? '')
      .digest();

    if (!timingSafeEqual(expected, provided)) {
      throw new UnauthorizedException({
        message: 'API key inválida.',
        code: 'INVALID_API_KEY',
      });
    }
  }
}
