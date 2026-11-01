import { Application } from '../../src/domain/applications/entities/application.entity';
import { ApplicationFile } from '../../src/domain/applications/entities/application-file.entity';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import {
  ApplicationRepository,
  ApplicationStatusCount,
  FindApplicationsPageOptions,
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
    company: application.company,
    companyUrl: application.companyUrl,
    position: application.position,
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

function matchesSearch(application: Application, search: string): boolean {
  return [
    application.title,
    application.company,
    application.currentPhase,
  ].some((value) => value.toLowerCase().includes(search));
}

function isAfterCursor(
  application: Application,
  options: FindApplicationsPageOptions,
): boolean {
  const cursor = options.cursor;

  if (!cursor) {
    return true;
  }

  const createdAt = application.createdAt.getTime();
  const cursorCreatedAt = cursor.value.getTime();

  if (options.sort === 'recent') {
    return (
      createdAt < cursorCreatedAt ||
      (createdAt === cursorCreatedAt && application.id < cursor.id)
    );
  }

  const updatedAt = application.updatedAt.getTime();

  return (
    updatedAt > cursorCreatedAt ||
    (updatedAt === cursorCreatedAt && application.id > cursor.id)
  );
}

function compare(
  left: Application,
  right: Application,
  sort: FindApplicationsPageOptions['sort'],
): number {
  if (sort === 'recent') {
    return (
      right.createdAt.getTime() - left.createdAt.getTime() ||
      right.id.localeCompare(left.id)
    );
  }

  return (
    left.updatedAt.getTime() - right.updatedAt.getTime() ||
    left.id.localeCompare(right.id)
  );
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

  async findPage(
    userId: string,
    options: FindApplicationsPageOptions,
  ): Promise<Application[]> {
    const search = options.search?.toLowerCase();

    return [...this.applications.values()]
      .filter((entry) => entry.userId === userId)
      .map((entry) => entry.application)
      .filter((application) => !application.isDeleted)
      .filter(
        (application) =>
          !options.status || application.status === options.status,
      )
      .filter((application) => !search || matchesSearch(application, search))
      .filter((application) => isAfterCursor(application, options))
      .sort((left, right) => compare(left, right, options.sort))
      .slice(0, options.limit)
      .map(cloneApplication);
  }

  async countByStatus(userId: string): Promise<ApplicationStatusCount> {
    const counts: ApplicationStatusCount = {
      [ApplicationStatus.PENDING]: 0,
      [ApplicationStatus.IN_PROGRESS]: 0,
      [ApplicationStatus.COMPLETED]: 0,
      [ApplicationStatus.REJECTED]: 0,
    };

    for (const entry of this.applications.values()) {
      if (entry.userId === userId && !entry.application.isDeleted) {
        counts[entry.application.status] += 1;
      }
    }

    return counts;
  }

  async findAll(
    userId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<Application[]> {
    return [...this.applications.values()]
      .filter((entry) => entry.userId === userId)
      .map((entry) => entry.application)
      .filter(
        (application) =>
          options.includeDeleted === true || !application.isDeleted,
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
