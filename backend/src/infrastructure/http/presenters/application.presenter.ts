import { Application } from '../../../domain/applications/entities/application.entity';
import { ApplicationFile } from '../../../domain/applications/entities/application-file.entity';
import { ApplicationStatus } from '../../../domain/applications/enums/application-status.enum';

export type ApplicationFileHttpResponse = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  sizeInBytes: number;
  uploadedAt: string;
};

export type ApplicationHttpResponse = {
  id: string;
  title: string;
  link: string;
  status: ApplicationStatus;
  currentPhase: string;
  files: ApplicationFileHttpResponse[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export class ApplicationPresenter {
  static toHTTP(application: Application): ApplicationHttpResponse {
    return {
      id: application.id,
      title: application.title,
      link: application.link,
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
