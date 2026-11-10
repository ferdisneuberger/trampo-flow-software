import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class PreviewJobPostingDto {
  @ApiProperty({
    description: 'Link da vaga para buscar título, empresa e site.',
    example: 'https://acme.gupy.io/jobs/123456',
    maxLength: 2048,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: true,
  })
  link!: string;
}
