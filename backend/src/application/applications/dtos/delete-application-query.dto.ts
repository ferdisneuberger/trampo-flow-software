import { IsIn, IsOptional } from 'class-validator';
import {
  APPLICATION_DELETE_MODES,
  ApplicationDeleteMode,
} from '../types/application-delete-mode';

export class DeleteApplicationQueryDto {
  @IsOptional()
  @IsIn(APPLICATION_DELETE_MODES)
  mode?: ApplicationDeleteMode;
}
