import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token recebido no link de recuperação.',
    maxLength: 512,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string;

  @ApiProperty({
    description:
      'Nova senha em texto puro (mínimo de 8 caracteres, com maiúscula, número e caractere especial).',
    format: 'password',
    minLength: 8,
    maxLength: 256,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  password!: string;
}
