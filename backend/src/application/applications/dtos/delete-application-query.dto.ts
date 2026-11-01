import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import {
  APPLICATION_DELETE_MODES,
  ApplicationDeleteMode,
} from '../types/application-delete-mode';

export class DeleteApplicationQueryDto {
  @ApiPropertyOptional({
    description:
      'Modo de exclusão. `soft` preenche `deletedAt`, `hard` remove o registro.',
    enum: APPLICATION_DELETE_MODES,
    enumName: 'ApplicationDeleteMode',
    default: 'soft',
  })
  @IsOptional()
  @IsIn(APPLICATION_DELETE_MODES)
  mode?: ApplicationDeleteMode;
}
