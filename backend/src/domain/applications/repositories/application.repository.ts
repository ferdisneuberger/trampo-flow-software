import { Application } from '../entities/application.entity';
import { ApplicationStatus } from '../enums/application-status.enum';

export type ApplicationSort = 'recent' | 'stale';

export type ApplicationCursor = {
  sort: ApplicationSort;
  value: Date;
  id: string;
};

export type FindApplicationsPageOptions = {
  limit: number;
  sort: ApplicationSort;
  search?: string;
  status?: ApplicationStatus;
  cursor?: ApplicationCursor;
};

export type ApplicationStatusCount = Record<ApplicationStatus, number>;

export type PlaceApplicationInput = {
  applicationId: string;
  userId: string;
  status: ApplicationStatus;
  position: number;
};

export abstract class ApplicationRepository {
  abstract create(application: Application, userId: string): Promise<void>;

  /**
   * Returns the application even when it was soft deleted so use cases can
   * distinguish "not found" from "already deleted".
   */
  abstract findById(id: string, userId: string): Promise<Application | null>;

  abstract findPage(
    userId: string,
    options: FindApplicationsPageOptions,
  ): Promise<Application[]>;

  abstract countByStatus(userId: string): Promise<ApplicationStatusCount>;

  abstract findMaxPosition(
    userId: string,
    status: ApplicationStatus,
  ): Promise<number>;

  abstract reindexStatus(
    userId: string,
    status: ApplicationStatus,
  ): Promise<void>;

  abstract place(input: PlaceApplicationInput): Promise<void>;

  abstract update(application: Application, userId: string): Promise<void>;

  /**
   * Physically removes the application and its files.
   */
  abstract delete(application: Application, userId: string): Promise<void>;
}
