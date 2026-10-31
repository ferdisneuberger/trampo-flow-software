import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Public } from '../../auth/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
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
