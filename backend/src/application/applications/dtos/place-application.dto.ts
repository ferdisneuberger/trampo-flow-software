import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApplicationStatus } from '../../../domain/applications/enums/application-status.enum';

export class PlaceApplicationDto {
  @ApiPropertyOptional({
    description: 'Status de destino. Mantém o atual quando omitido.',
    enum: ApplicationStatus,
    enumName: 'ApplicationStatus',
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Candidatura que ficará imediatamente acima.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  beforeId?: string;

  @ApiPropertyOptional({
    description: 'Candidatura que ficará imediatamente abaixo.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  afterId?: string;
}
