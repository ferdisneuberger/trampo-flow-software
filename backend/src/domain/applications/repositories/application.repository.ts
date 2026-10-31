import { Application } from '../entities/application.entity';

export type FindAllApplicationsOptions = {
  includeDeleted?: boolean;
};

export abstract class ApplicationRepository {
  abstract create(application: Application): Promise<void>;

  /**
   * Returns the application even when it was soft deleted so use cases can
   * distinguish "not found" from "already deleted".
   */
  abstract findById(id: string): Promise<Application | null>;

  abstract findAll(
    options?: FindAllApplicationsOptions,
  ): Promise<Application[]>;

  abstract update(application: Application): Promise<void>;

  /**
   * Physically removes the application and its files.
   */
  abstract delete(application: Application): Promise<void>;
}
