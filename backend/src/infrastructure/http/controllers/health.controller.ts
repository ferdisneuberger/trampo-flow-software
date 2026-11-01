import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Public } from '../../auth/public.decorator';
import { HealthResponse } from '../schemas/http.schemas';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Verifica a API e a conexão com o banco' })
  @ApiOkResponse({ type: HealthResponse })
  @ApiResponse({
    status: 503,
    description: 'Banco indisponível.',
    type: HealthResponse,
  })
  async check(): Promise<{ status: string; database: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        database: 'up',
      };
    } catch {
      throw new HttpException(
        {
          status: 'degraded',
          database: 'down',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
