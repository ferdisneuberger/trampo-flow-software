import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateApplicationDto {
  @ApiProperty({
    description: 'Título da vaga.',
    example: 'Backend Engineer - Nubank',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @ApiProperty({
    description: 'Link da vaga.',
    example: 'https://example.com/jobs/nubank-backend',
    maxLength: 2048,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  link!: string;

  @ApiProperty({
    description: 'Empresa da vaga.',
    example: 'Nubank',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  company!: string;

  @ApiPropertyOptional({
    description: 'Site da empresa.',
    example: 'https://nubank.com.br',
    maxLength: 2048,
  })
  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  companyUrl?: string;

  @ApiProperty({
    description: 'Fase atual do processo seletivo.',
    example: 'Teste técnico',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  currentPhase!: string;

  @ApiPropertyOptional({
    description: 'Status da candidatura. Padrão: PENDING.',
    enum: ApplicationStatus,
    enumName: 'ApplicationStatus',
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}
