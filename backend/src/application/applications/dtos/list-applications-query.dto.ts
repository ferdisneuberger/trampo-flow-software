import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApplicationStatus } from '../../../domain/applications/enums/application-status.enum';
import { ApplicationSort } from '../../../domain/applications/repositories/application.repository';

export class ListApplicationsQueryDto {
  @ApiPropertyOptional({
    description: 'Busca por título, empresa ou fase atual.',
    example: 'nubank',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtra por status.',
    enum: ApplicationStatus,
    enumName: 'ApplicationStatus',
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Cursor opaco devolvido em nextCursor.',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Quantidade de itens por página.',
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'recent ordena por criação; stale ordena por atualização mais antiga.',
    enum: ['recent', 'stale'],
    default: 'recent',
  })
  @IsOptional()
  @IsIn(['recent', 'stale'])
  sort?: ApplicationSort;
}
