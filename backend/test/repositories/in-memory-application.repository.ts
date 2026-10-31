import { Application } from '../../src/domain/applications/entities/application.entity';
import { ApplicationFile } from '../../src/domain/applications/entities/application-file.entity';
import {
  ApplicationRepository,
  FindAllApplicationsOptions,
} from '../../src/domain/applications/repositories/application.repository';

function cloneApplication(application: Application): Application {
  return Application.restore({
    id: application.id,
    title: application.title,
    link: application.link,
    status: application.status,
    currentPhase: application.currentPhase,
    files: application.files.map((file) =>
      ApplicationFile.restore({
        id: file.id,
        name: file.name,
        url: file.url,
        mimeType: file.mimeType,
        sizeInBytes: file.sizeInBytes,
        uploadedAt: file.uploadedAt,
      }),
    ),
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    deletedAt: application.deletedAt,
  });
}

export class InMemoryApplicationRepository implements ApplicationRepository {
  private readonly applications = new Map<string, Application>();

  async create(application: Application): Promise<void> {
    if (this.applications.has(application.id)) {
      throw new Error(`Application "${application.id}" already exists.`);
    }

    this.applications.set(application.id, cloneApplication(application));
  }

  async findById(id: string): Promise<Application | null> {
    const application = this.applications.get(id);

    return application ? cloneApplication(application) : null;
  }

  async findAll(
    options?: FindAllApplicationsOptions,
  ): Promise<Application[]> {
    return [...this.applications.values()]
      .filter(
        (application) =>
          options?.includeDeleted === true || !application.isDeleted,
      )
      .sort(
        (left, right) =>
          right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .map(cloneApplication);
  }

  async update(application: Application): Promise<void> {
    if (!this.applications.has(application.id)) {
      throw new Error(`Application "${application.id}" does not exist.`);
    }

    this.applications.set(application.id, cloneApplication(application));
  }

  async delete(application: Application): Promise<void> {
    this.applications.delete(application.id);
  }

  async clear(): Promise<void> {
    this.applications.clear();
  }

  get count(): number {
    return this.applications.size;
  }
}
