import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Nome de usuário.',
    example: 'fernando',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  username!: string;

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
