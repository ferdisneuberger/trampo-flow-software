import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PERSON_NAME_MAX_LENGTH } from '../../../domain/users/entities/user.entity';

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
    description: 'Primeiro nome.',
    example: 'Fernando',
    maxLength: PERSON_NAME_MAX_LENGTH,
  })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(PERSON_NAME_MAX_LENGTH)
  firstName!: string;

  @ApiProperty({
    description: 'Último nome.',
    example: 'Neuberger',
    maxLength: PERSON_NAME_MAX_LENGTH,
  })
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(PERSON_NAME_MAX_LENGTH)
  lastName!: string;

  @ApiProperty({
    description:
      'Senha em texto puro (mínimo de 8 caracteres, com maiúscula, número e caractere especial).',
    example: 'Senha-super-secreta1!',
    format: 'password',
    minLength: 8,
    maxLength: 256,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  password!: string;

  @ApiProperty({
    description: 'Aceite dos termos de uso.',
    example: true,
  })
  @IsBoolean()
  termsAccepted!: boolean;
}
