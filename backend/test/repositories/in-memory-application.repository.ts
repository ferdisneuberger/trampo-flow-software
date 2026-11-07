import { Application } from '../../src/domain/applications/entities/application.entity';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import {
  ApplicationRepository,
  ApplicationStatusCount,
  FindApplicationsPageOptions,
  PlaceApplicationInput,
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
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    deletedAt: application.deletedAt,
  });
}

function withPlacement(
  application: Application,
  status: ApplicationStatus,
  position: number,
): Application {
  return Application.restore({
    id: application.id,
    title: application.title,
    link: application.link,
    company: application.company,
    companyUrl: application.companyUrl,
    position,
    status,
    currentPhase: application.currentPhase,
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

    const position =
      (await this.findMaxPosition(userId, application.status)) + 1000;

    this.applications.set(application.id, {
      userId,
      application: withPlacement(application, application.status, position),
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

  async findBoardColumn(
    userId: string,
    status: ApplicationStatus,
    options: { limit: number; search?: string },
  ): Promise<Application[]> {
    const search = options.search?.toLowerCase();

    return [...this.applications.values()]
      .filter((entry) => entry.userId === userId)
      .map((entry) => entry.application)
      .filter((application) => !application.isDeleted)
      .filter((application) => application.status === status)
      .filter((application) => !search || matchesSearch(application, search))
      .sort(
        (left, right) =>
          left.position - right.position || left.id.localeCompare(right.id),
      )
      .slice(0, options.limit)
      .map(cloneApplication);
  }

  async findMaxPosition(
    userId: string,
    status: ApplicationStatus,
  ): Promise<number> {
    return [...this.applications.values()]
      .filter(
        (entry) =>
          entry.userId === userId &&
          !entry.application.isDeleted &&
          entry.application.status === status,
      )
      .reduce((max, entry) => Math.max(max, entry.application.position), 0);
  }

  async reindexStatus(
    userId: string,
    status: ApplicationStatus,
  ): Promise<void> {
    const rows = [...this.applications.values()]
      .filter(
        (entry) =>
          entry.userId === userId &&
          !entry.application.isDeleted &&
          entry.application.status === status,
      )
      .sort(
        (left, right) =>
          left.application.position - right.application.position ||
          left.application.id.localeCompare(right.application.id),
      );

    rows.forEach((entry, index) => {
      entry.application = withPlacement(
        entry.application,
        status,
        (index + 1) * 1000,
      );
    });
  }

  async place(input: PlaceApplicationInput): Promise<void> {
    const entry = this.applications.get(input.applicationId);

    if (!entry || entry.userId !== input.userId) {
      throw new Error(`Application "${input.applicationId}" does not exist.`);
    }

    entry.application = withPlacement(
      entry.application,
      input.status,
      input.position,
    );
  }

  async update(application: Application, userId: string): Promise<void> {
    const entry = this.applications.get(application.id);

    if (!entry || entry.userId !== userId) {
      throw new Error(`Application "${application.id}" does not exist.`);
    }

    const statusChanged = entry.application.status !== application.status;
    const position = statusChanged
      ? (await this.findMaxPosition(userId, application.status)) + 1000
      : application.position;

    this.applications.set(application.id, {
      userId,
      application: withPlacement(application, application.status, position),
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
