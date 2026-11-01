import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Application } from '../../../../domain/applications/entities/application.entity';
import { ApplicationStatus } from '../../../../domain/applications/enums/application-status.enum';
import {
  ApplicationRepository,
  ApplicationStatusCount,
  FindApplicationsPageOptions,
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
    await this.prisma.application.create({
      data: {
        ...ApplicationMapper.toCreateData(application),
        user: { connect: { id: userId } },
      },
    });
  }

  async findById(id: string, userId: string): Promise<Application | null> {
    const record = await this.prisma.application.findFirst({
      where: { id, userId },
      include: { files: true },
    });

    return record ? ApplicationMapper.toDomain(record) : null;
  }

  async findPage(
    userId: string,
    options: FindApplicationsPageOptions,
  ): Promise<Application[]> {
    const records = await this.prisma.application.findMany({
      where: buildWhere(userId, options),
      include: { files: true },
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

  async update(application: Application, userId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.application.updateMany({
        where: { id: application.id, userId },
        data: ApplicationMapper.toUpdateData(application),
      });

      if (updated.count === 0) {
        throw new Error(
          `Application "${application.id}" was not found for this user.`,
        );
      }

      const fileIds = application.files.map((file) => file.id);

      await transaction.applicationFile.deleteMany({
        where: {
          applicationId: application.id,
          ...(fileIds.length > 0 ? { id: { notIn: fileIds } } : {}),
        },
      });

      for (const file of application.files) {
        await transaction.applicationFile.upsert({
          where: { id: file.id },
          create: {
            ...ApplicationMapper.toFileCreateData(file),
            applicationId: application.id,
          },
          update: {
            ...ApplicationMapper.toFileUpdateData(file),
            applicationId: application.id,
          },
        });
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
