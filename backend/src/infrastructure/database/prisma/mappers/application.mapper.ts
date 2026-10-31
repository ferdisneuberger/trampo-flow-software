import {
  Application as PrismaApplication,
  ApplicationFile as PrismaApplicationFile,
  ApplicationStatus as PrismaApplicationStatus,
  Prisma,
} from '@prisma/client';
import { Application } from '../../../../domain/applications/entities/application.entity';
import { ApplicationFile } from '../../../../domain/applications/entities/application-file.entity';
import { ApplicationStatus } from '../../../../domain/applications/enums/application-status.enum';

const statusToDomain: Record<
  PrismaApplicationStatus,
  ApplicationStatus
> = {
  [PrismaApplicationStatus.PENDING]: ApplicationStatus.PENDING,
  [PrismaApplicationStatus.IN_PROGRESS]: ApplicationStatus.IN_PROGRESS,
  [PrismaApplicationStatus.COMPLETED]: ApplicationStatus.COMPLETED,
  [PrismaApplicationStatus.REJECTED]: ApplicationStatus.REJECTED,
};

const statusToPersistence: Record<
  ApplicationStatus,
  PrismaApplicationStatus
> = {
  [ApplicationStatus.PENDING]: PrismaApplicationStatus.PENDING,
  [ApplicationStatus.IN_PROGRESS]: PrismaApplicationStatus.IN_PROGRESS,
  [ApplicationStatus.COMPLETED]: PrismaApplicationStatus.COMPLETED,
  [ApplicationStatus.REJECTED]: PrismaApplicationStatus.REJECTED,
};

export type PrismaApplicationWithFiles = PrismaApplication & {
  files: PrismaApplicationFile[];
};

export class ApplicationMapper {
  static toDomain(record: PrismaApplicationWithFiles): Application {
    return Application.restore({
      id: record.id,
      title: record.title,
      link: record.link,
      status: statusToDomain[record.status],
      currentPhase: record.currentPhase,
      files: record.files.map((file) =>
        ApplicationFile.restore({
          id: file.id,
          name: file.name,
          url: file.url,
          mimeType: file.mimeType,
          sizeInBytes: file.sizeInBytes,
          uploadedAt: file.uploadedAt,
        }),
      ),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }

  static toCreateData(
    application: Application,
  ): Prisma.ApplicationCreateInput {
    return {
      id: application.id,
      title: application.title,
      link: application.link,
      status: statusToPersistence[application.status],
      currentPhase: application.currentPhase,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      deletedAt: application.deletedAt,
      files: {
        create: application.files.map((file) =>
          ApplicationMapper.toFileCreateData(file),
        ),
      },
    };
  }

  static toUpdateData(
    application: Application,
  ): Prisma.ApplicationUncheckedUpdateInput {
    return {
      title: application.title,
      link: application.link,
      status: statusToPersistence[application.status],
      currentPhase: application.currentPhase,
      updatedAt: application.updatedAt,
      deletedAt: application.deletedAt,
    };
  }

  static toFileCreateData(
    file: ApplicationFile,
  ): Prisma.ApplicationFileCreateWithoutApplicationInput {
    return {
      id: file.id,
      name: file.name,
      url: file.url,
      mimeType: file.mimeType,
      sizeInBytes: file.sizeInBytes,
      uploadedAt: file.uploadedAt,
    };
  }

  static toFileUpdateData(
    file: ApplicationFile,
  ): Prisma.ApplicationFileUncheckedUpdateInput {
    return {
      name: file.name,
      url: file.url,
      mimeType: file.mimeType,
      sizeInBytes: file.sizeInBytes,
      uploadedAt: file.uploadedAt,
    };
  }
}
