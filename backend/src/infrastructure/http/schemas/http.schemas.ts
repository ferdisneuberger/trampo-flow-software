import { ApiProperty } from '@nestjs/swagger';
import { ApplicationHttpResponse } from '../presenters/application.presenter';

export class AuthenticatedUserResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'fernando' })
  username!: string;
}

export class LoginResponse {
  @ApiProperty({ description: 'Token JWT no formato compacto.' })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({
    description: 'Tempo de vida do token em segundos.',
    example: 28_800,
  })
  expiresIn!: number;

  @ApiProperty({
    description: 'Instante de expiração em epoch, em segundos.',
    example: 1_800_000_000,
  })
  expiresAt!: number;

  @ApiProperty({ type: AuthenticatedUserResponse })
  user!: AuthenticatedUserResponse;
}

export class ApplicationStatusCountResponse {
  @ApiProperty({ example: 3 })
  PENDING!: number;

  @ApiProperty({ example: 5 })
  IN_PROGRESS!: number;

  @ApiProperty({ example: 4 })
  COMPLETED!: number;

  @ApiProperty({ example: 0 })
  REJECTED!: number;
}

export class ApplicationStatsResponse {
  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ type: ApplicationStatusCountResponse })
  byStatus!: ApplicationStatusCountResponse;
}

export class PaginatedApplicationsResponse {
  @ApiProperty({ type: [ApplicationHttpResponse] })
  items!: ApplicationHttpResponse[];

  @ApiProperty({
    nullable: true,
    example: 'MjAyNi0xMC0xMlQxMjowMDowMC4wMDBafDZkMGYzZjdl',
  })
  nextCursor!: string | null;

  @ApiProperty({ example: true })
  hasMore!: boolean;
}

export class HealthResponse {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'up' })
  database!: string;
}

export class ErrorResponse {
  @ApiProperty({ example: 'APPLICATION_NOT_FOUND' })
  error!: string;

  @ApiProperty({ example: 'Candidatura não encontrada.' })
  message!: string;
}
