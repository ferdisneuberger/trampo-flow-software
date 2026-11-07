import {
  Application as PrismaApplication,
  ApplicationStatus as PrismaApplicationStatus,
  Prisma,
} from '@prisma/client';
import { Application } from '../../../../domain/applications/entities/application.entity';
import { ApplicationStatus } from '../../../../domain/applications/enums/application-status.enum';

const statusToDomain: Record<PrismaApplicationStatus, ApplicationStatus> = {
  [PrismaApplicationStatus.PENDING]: ApplicationStatus.PENDING,
  [PrismaApplicationStatus.IN_PROGRESS]: ApplicationStatus.IN_PROGRESS,
  [PrismaApplicationStatus.COMPLETED]: ApplicationStatus.COMPLETED,
  [PrismaApplicationStatus.REJECTED]: ApplicationStatus.REJECTED,
};

const statusToPersistence: Record<ApplicationStatus, PrismaApplicationStatus> =
  {
    [ApplicationStatus.PENDING]: PrismaApplicationStatus.PENDING,
    [ApplicationStatus.IN_PROGRESS]: PrismaApplicationStatus.IN_PROGRESS,
    [ApplicationStatus.COMPLETED]: PrismaApplicationStatus.COMPLETED,
    [ApplicationStatus.REJECTED]: PrismaApplicationStatus.REJECTED,
  };

export type PrismaApplicationRecord = PrismaApplication;

export class ApplicationMapper {
  static toDomain(record: PrismaApplicationRecord): Application {
    return Application.restore({
      id: record.id,
      title: record.title,
      link: record.link,
      company: record.company,
      companyUrl: record.companyUrl,
      position: record.position,
      status: statusToDomain[record.status],
      currentPhase: record.currentPhase,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }

  static toCreateData(
    application: Application,
  ): Omit<Prisma.ApplicationCreateInput, 'user'> {
    return {
      id: application.id,
      title: application.title,
      link: application.link,
      company: application.company,
      companyUrl: application.companyUrl,
      position: application.position,
      status: statusToPersistence[application.status],
      currentPhase: application.currentPhase,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      deletedAt: application.deletedAt,
    };
  }

  static toUpdateData(
    application: Application,
  ): Prisma.ApplicationUncheckedUpdateInput {
    return {
      title: application.title,
      link: application.link,
      company: application.company,
      companyUrl: application.companyUrl,
      position: application.position,
      status: statusToPersistence[application.status],
      currentPhase: application.currentPhase,
      updatedAt: application.updatedAt,
      deletedAt: application.deletedAt,
    };
  }
}
