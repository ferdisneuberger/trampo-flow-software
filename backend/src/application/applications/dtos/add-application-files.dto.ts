import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { CreateApplicationFileDto } from './create-application.dto';

export class AddApplicationFilesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateApplicationFileDto)
  files!: CreateApplicationFileDto[];
}
