import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Application } from '../../../../domain/applications/entities/application.entity';
import { ApplicationStatus } from '../../../../domain/applications/enums/application-status.enum';
import {
  ApplicationRepository,
  ApplicationStatusCount,
  FindApplicationsPageOptions,
  PlaceApplicationInput,
} from '../../../../domain/applications/repositories/application.repository';
import { ApplicationMapper } from '../mappers/application.mapper';
import { PrismaService } from '../prisma.service';

function buildWhere(
  userId: string,
  options: FindApplicationsPageOptions,
): Prisma.ApplicationWhereInput {
  const conditions: Prisma.ApplicationWhereInput[] = [
    { userId, deletedAt: null },
  ];

  if (options.status) {
    conditions.push({ status: options.status });
  }

  if (options.search) {
    conditions.push({
      OR: [
        { title: { contains: options.search, mode: 'insensitive' } },
        { company: { contains: options.search, mode: 'insensitive' } },
        { currentPhase: { contains: options.search, mode: 'insensitive' } },
      ],
    });
  }

  if (options.cursor) {
    const { sort, value, id } = options.cursor;

    conditions.push(
      sort === 'recent'
        ? {
            OR: [
              { createdAt: { lt: value } },
              { createdAt: value, id: { lt: id } },
            ],
          }
        : {
            OR: [
              { updatedAt: { gt: value } },
              { updatedAt: value, id: { gt: id } },
            ],
          },
    );
  }

  return { AND: conditions };
}

@Injectable()
export class PrismaApplicationRepository implements ApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(application: Application, userId: string): Promise<void> {
    const aggregate = await this.prisma.application.aggregate({
      where: {
        userId,
        status: application.status,
        deletedAt: null,
      },
      _max: { position: true },
    });

    await this.prisma.application.create({
      data: {
        ...ApplicationMapper.toCreateData(application),
        position: (aggregate._max.position ?? 0) + 1000,
        user: { connect: { id: userId } },
      },
    });
  }

  async findById(id: string, userId: string): Promise<Application | null> {
    const record = await this.prisma.application.findFirst({
      where: { id, userId },
    });

    return record ? ApplicationMapper.toDomain(record) : null;
  }

  async findPage(
    userId: string,
    options: FindApplicationsPageOptions,
  ): Promise<Application[]> {
    const records = await this.prisma.application.findMany({
      where: buildWhere(userId, options),
      orderBy:
        options.sort === 'recent'
          ? [{ createdAt: 'desc' }, { id: 'desc' }]
          : [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: options.limit,
    });

    return records.map((record) => ApplicationMapper.toDomain(record));
  }

  async countByStatus(userId: string): Promise<ApplicationStatusCount> {
    const groups = await this.prisma.application.groupBy({
      by: ['status'],
      where: { userId, deletedAt: null },
      _count: { _all: true },
    });

    const counts: ApplicationStatusCount = {
      [ApplicationStatus.PENDING]: 0,
      [ApplicationStatus.IN_PROGRESS]: 0,
      [ApplicationStatus.COMPLETED]: 0,
      [ApplicationStatus.REJECTED]: 0,
    };

    for (const group of groups) {
      counts[group.status] = group._count._all;
    }

    return counts;
  }

  async findBoardColumn(
    userId: string,
    status: ApplicationStatus,
    options: { limit: number; search?: string },
  ): Promise<Application[]> {
    const records = await this.prisma.application.findMany({
      where: buildWhere(userId, {
        limit: options.limit,
        sort: 'recent',
        status,
        search: options.search,
      }),
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      take: options.limit,
    });

    return records.map((record) => ApplicationMapper.toDomain(record));
  }

  async findMaxPosition(
    userId: string,
    status: ApplicationStatus,
  ): Promise<number> {
    const aggregate = await this.prisma.application.aggregate({
      where: { userId, status, deletedAt: null },
      _max: { position: true },
    });

    return aggregate._max.position ?? 0;
  }

  async reindexStatus(
    userId: string,
    status: ApplicationStatus,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const rows = await transaction.application.findMany({
        where: { userId, status, deletedAt: null },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });

      for (const [index, row] of rows.entries()) {
        await transaction.application.update({
          where: { id: row.id },
          data: { position: (index + 1) * 1000 },
        });
      }
    });
  }

  async place(input: PlaceApplicationInput): Promise<void> {
    const updated = await this.prisma.application.updateMany({
      where: { id: input.applicationId, userId: input.userId },
      data: { status: input.status, position: input.position },
    });

    if (updated.count === 0) {
      throw new Error(
        `Application "${input.applicationId}" was not found for this user.`,
      );
    }
  }

  async update(application: Application, userId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const current = await transaction.application.findUnique({
        where: { id: application.id },
        select: { status: true },
      });

      const data = ApplicationMapper.toUpdateData(application);

      if (
        current &&
        (current.status as string) !== (application.status as string)
      ) {
        const aggregate = await transaction.application.aggregate({
          where: {
            userId,
            status: application.status,
            deletedAt: null,
          },
          _max: { position: true },
        });

        data.position = (aggregate._max.position ?? 0) + 1000;
      }

      const updated = await transaction.application.updateMany({
        where: { id: application.id, userId },
        data,
      });

      if (updated.count === 0) {
        throw new Error(
          `Application "${application.id}" was not found for this user.`,
        );
      }
    });
  }

  async delete(application: Application, userId: string): Promise<void> {
    const deleted = await this.prisma.application.deleteMany({
      where: { id: application.id, userId },
    });

    if (deleted.count === 0) {
      throw new Error(
        `Application "${application.id}" was not found for this user.`,
      );
    }
  }
}
