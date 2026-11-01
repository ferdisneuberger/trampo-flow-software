import { Application } from '../entities/application.entity';

export type FindAllApplicationsOptions = {
  includeDeleted?: boolean;
};

export abstract class ApplicationRepository {
  abstract create(application: Application, userId: string): Promise<void>;

  /**
   * Returns the application even when it was soft deleted so use cases can
   * distinguish "not found" from "already deleted".
   */
  abstract findById(id: string, userId: string): Promise<Application | null>;

  abstract findAll(
    userId: string,
    options?: FindAllApplicationsOptions,
  ): Promise<Application[]>;

  abstract update(application: Application, userId: string): Promise<void>;

  /**
   * Physically removes the application and its files.
   */
  abstract delete(application: Application, userId: string): Promise<void>;
}
