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
  ValidateNested,
} from 'class-validator';
import { ApplicationStatus } from '../../../domain/applications/enums/application-status.enum';

export class CreateApplicationFileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  url!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType!: string;

  @IsInt()
  @Min(1)
  sizeInBytes!: number;

  @IsOptional()
  @IsISO8601()
  uploadedAt?: string;
}

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  link!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  currentPhase!: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateApplicationFileDto)
  files?: CreateApplicationFileDto[];
}
