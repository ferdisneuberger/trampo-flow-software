import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    description: 'E-mail que será confirmado.',
    example: 'pessoa@exemplo.com',
    maxLength: 254,
  })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toLowerCase() : undefined,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    description: 'Senha em texto puro.',
    example: 'senha-super-secreta',
    format: 'password',
    minLength: 12,
    maxLength: 256,
  })
  @IsString()
  @MinLength(12)
  @MaxLength(256)
  password!: string;

  @ApiProperty({
    description: 'Aceite dos termos de uso.',
    example: true,
  })
  @IsBoolean()
  termsAccepted!: boolean;
}
