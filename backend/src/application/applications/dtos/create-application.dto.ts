import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApplicationStatus } from '../../../domain/applications/enums/application-status.enum';

export class CreateApplicationFileDto {
  @ApiProperty({
    description: 'Nome do arquivo.',
    example: 'curriculo.pdf',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'URL pública do arquivo.',
    example: 'https://example.com/files/curriculo.pdf',
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
  url!: string;

  @ApiProperty({
    description: 'Tipo MIME do arquivo.',
    example: 'application/pdf',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType!: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes.',
    example: 182_331,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  sizeInBytes!: number;

  @ApiPropertyOptional({
    description: 'Data de upload em ISO 8601. Padrão: agora.',
    format: 'date-time',
    example: '2026-10-23T18:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  uploadedAt?: string;
}

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

  @ApiPropertyOptional({
    description: 'Arquivos anexados na criação.',
    type: [CreateApplicationFileDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateApplicationFileDto)
  files?: CreateApplicationFileDto[];
}
