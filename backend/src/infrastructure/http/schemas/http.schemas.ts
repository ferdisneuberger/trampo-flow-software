import { ApiProperty } from '@nestjs/swagger';

export class AuthenticatedUserResponse {
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

  @ApiProperty({ type: AuthenticatedUserResponse })
  user!: AuthenticatedUserResponse;
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
