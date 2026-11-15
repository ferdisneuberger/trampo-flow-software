import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PERSONAL_ACCESS_TOKEN_NAME_MAX_LENGTH } from '../../../domain/auth/entities/personal-access-token.entity';
import {
  PERSONAL_ACCESS_TOKEN_DEFAULT_DAYS,
  PERSONAL_ACCESS_TOKEN_MAX_DAYS,
} from '../use-cases/create-personal-access-token.use-case';

export class CreatePersonalAccessTokenDto {
  @ApiProperty({
    description: 'Nome para identificar onde o token é usado.',
    example: 'Claude Code no notebook',
    maxLength: PERSONAL_ACCESS_TOKEN_NAME_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(PERSONAL_ACCESS_TOKEN_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional({
    description: 'Validade em dias.',
    minimum: 1,
    maximum: PERSONAL_ACCESS_TOKEN_MAX_DAYS,
    default: PERSONAL_ACCESS_TOKEN_DEFAULT_DAYS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PERSONAL_ACCESS_TOKEN_MAX_DAYS)
  expiresInDays?: number;
}
