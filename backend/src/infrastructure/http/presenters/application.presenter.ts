import { ApiProperty } from '@nestjs/swagger';
import { Application } from '../../../domain/applications/entities/application.entity';
import { ApplicationStatus } from '../../../domain/applications/enums/application-status.enum';

export class ApplicationHttpResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Backend Engineer - Nubank' })
  title!: string;

  @ApiProperty({ example: 'https://example.com/jobs/nubank-backend' })
  link!: string;

  @ApiProperty({ example: 'Nubank' })
  company!: string;

  @ApiProperty({
    example: 'https://nubank.com.br',
    nullable: true,
  })
  companyUrl!: string | null;

  @ApiProperty({ example: 1000 })
  position!: number;

  @ApiProperty({ enum: ApplicationStatus, enumName: 'ApplicationStatus' })
  status!: ApplicationStatus;

  @ApiProperty({ example: 'Teste técnico' })
  currentPhase!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({
    format: 'date-time',
    nullable: true,
    description: 'Preenchido quando a candidatura foi excluída logicamente.',
  })
  deletedAt!: string | null;
}

export class ApplicationPresenter {
  static toHTTP(application: Application): ApplicationHttpResponse {
    return {
      id: application.id,
      title: application.title,
      link: application.link,
      company: application.company,
      companyUrl: application.companyUrl,
      position: application.position,
      status: application.status,
      currentPhase: application.currentPhase,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      deletedAt: application.deletedAt?.toISOString() ?? null,
    };
  }
}
