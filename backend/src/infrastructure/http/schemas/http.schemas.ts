import { ApiProperty } from '@nestjs/swagger';
import { ApplicationHttpResponse } from '../presenters/application.presenter';

export class AuthenticatedUserResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'pessoa@exemplo.com' })
  email!: string;

  @ApiProperty({ example: 'Fernando', nullable: true, type: String })
  firstName!: string | null;

  @ApiProperty({ example: 'Neuberger', nullable: true, type: String })
  lastName!: string | null;

  @ApiProperty({ example: true })
  emailVerified!: boolean;

  @ApiProperty({ example: true })
  hasPassword!: boolean;

  @ApiProperty({ example: true })
  termsAccepted!: boolean;

  @ApiProperty({
    enum: ['light', 'dark', 'system'],
    enumName: 'ThemePreference',
    example: 'light',
  })
  themePreference!: 'light' | 'dark' | 'system';

  @ApiProperty({
    example: '2026-11-03T12:02:00.000Z',
    nullable: true,
    type: String,
  })
  verificationResendAvailableAt!: string | null;
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

export class RefreshResponse {
  @ApiProperty({ description: 'Novo token JWT no formato compacto.' })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ description: 'Tempo de vida do token em segundos.' })
  expiresIn!: number;

  @ApiProperty({ description: 'Instante de expiração em epoch.' })
  expiresAt!: number;
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

export class BoardColumnResponse {
  @ApiProperty({ enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'] })
  status!: string;

  @ApiProperty({ example: 5 })
  total!: number;

  @ApiProperty({ type: [ApplicationHttpResponse] })
  items!: ApplicationHttpResponse[];

  @ApiProperty({ example: false })
  hasMore!: boolean;
}

export class BoardResponse {
  @ApiProperty({ type: [BoardColumnResponse] })
  columns!: BoardColumnResponse[];
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
