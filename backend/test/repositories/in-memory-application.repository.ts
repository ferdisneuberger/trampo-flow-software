import { Application } from '../../src/domain/applications/entities/application.entity';
import { ApplicationFile } from '../../src/domain/applications/entities/application-file.entity';
import {
  ApplicationRepository,
  FindAllApplicationsOptions,
} from '../../src/domain/applications/repositories/application.repository';

type Entry = {
  userId: string;
  application: Application;
};

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
  private readonly applications = new Map<string, Entry>();

  async create(application: Application, userId: string): Promise<void> {
    if (this.applications.has(application.id)) {
      throw new Error(`Application "${application.id}" already exists.`);
    }

    this.applications.set(application.id, {
      userId,
      application: cloneApplication(application),
    });
  }

  async findById(id: string, userId: string): Promise<Application | null> {
    const entry = this.applications.get(id);

    if (!entry || entry.userId !== userId) {
      return null;
    }

    return cloneApplication(entry.application);
  }

  async findAll(
    userId: string,
    options?: FindAllApplicationsOptions,
  ): Promise<Application[]> {
    return [...this.applications.values()]
      .filter((entry) => entry.userId === userId)
      .map((entry) => entry.application)
      .filter(
        (application) =>
          options?.includeDeleted === true || !application.isDeleted,
      )
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .map(cloneApplication);
  }

  async update(application: Application, userId: string): Promise<void> {
    const entry = this.applications.get(application.id);

    if (!entry || entry.userId !== userId) {
      throw new Error(`Application "${application.id}" does not exist.`);
    }

    this.applications.set(application.id, {
      userId,
      application: cloneApplication(application),
    });
  }

  async delete(application: Application, userId: string): Promise<void> {
    const entry = this.applications.get(application.id);

    if (!entry || entry.userId !== userId) {
      throw new Error(`Application "${application.id}" does not exist.`);
    }

    this.applications.delete(application.id);
  }

  async clear(): Promise<void> {
    this.applications.clear();
  }

  get count(): number {
    return this.applications.size;
  }
}
