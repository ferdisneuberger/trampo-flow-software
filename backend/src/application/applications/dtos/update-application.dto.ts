import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
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
    description: 'Empresa da vaga.',
    example: 'Nubank',
    minLength: 2,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  company?: string;

  @ApiPropertyOptional({
    description: 'Site da empresa. Envie null para limpar.',
    example: 'https://nubank.com.br',
    maxLength: 2048,
    nullable: true,
  })
  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  companyUrl?: string | null;

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
