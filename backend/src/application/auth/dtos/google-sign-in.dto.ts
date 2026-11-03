import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class GoogleSignInDto {
  @ApiProperty({
    description:
      'Credencial (ID token) retornada pelo Google Identity Services.',
    maxLength: 8192,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  credential!: string;

  @ApiProperty({
    description: 'Aceite dos termos para criação de uma nova conta.',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;
}
