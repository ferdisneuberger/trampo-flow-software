import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'E-mail cadastrado.',
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
    description: 'Senha em texto puro, enviada apenas no login.',
    example: 'senha-super-secreta',
    format: 'password',
    maxLength: 256,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  password!: string;
}
