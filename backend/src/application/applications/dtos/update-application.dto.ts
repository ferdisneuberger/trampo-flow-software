import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApplicationStatus } from '../../../domain/applications/enums/application-status.enum';

export class UpdateApplicationDto {
  @ApiPropertyOptional({
    description: 'Título da vaga.',
    example: 'Backend Engineer - Nubank',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({
    description: 'Link da vaga.',
    example: 'https://example.com/jobs/nubank-backend',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  link?: string;

  @ApiPropertyOptional({
    description: 'Fase atual do processo seletivo.',
    example: 'Entrevista técnica',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  currentPhase?: string;

  @ApiPropertyOptional({
    description: 'Status da candidatura.',
    enum: ApplicationStatus,
    enumName: 'ApplicationStatus',
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}
