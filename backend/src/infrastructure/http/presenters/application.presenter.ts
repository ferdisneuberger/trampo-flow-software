import { ApiProperty } from '@nestjs/swagger';
import { Application } from '../../../domain/applications/entities/application.entity';
import { ApplicationFile } from '../../../domain/applications/entities/application-file.entity';
import { ApplicationStatus } from '../../../domain/applications/enums/application-status.enum';

export class ApplicationFileHttpResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'curriculo.pdf' })
  name!: string;

  @ApiProperty({ example: 'https://example.com/files/curriculo.pdf' })
  url!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ example: 182_331 })
  sizeInBytes!: number;

  @ApiProperty({ format: 'date-time' })
  uploadedAt!: string;
}

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

  @ApiProperty({ type: [ApplicationFileHttpResponse] })
  files!: ApplicationFileHttpResponse[];

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
      files: application.files.map((file) =>
        ApplicationPresenter.fileToHTTP(file),
      ),
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      deletedAt: application.deletedAt?.toISOString() ?? null,
    };
  }

  private static fileToHTTP(
    file: ApplicationFile,
  ): ApplicationFileHttpResponse {
    return {
      id: file.id,
      name: file.name,
      url: file.url,
      mimeType: file.mimeType,
      sizeInBytes: file.sizeInBytes,
      uploadedAt: file.uploadedAt.toISOString(),
    };
  }
}
