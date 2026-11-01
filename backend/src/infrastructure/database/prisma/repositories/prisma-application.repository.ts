import { Injectable } from '@nestjs/common';
import { Application } from '../../../../domain/applications/entities/application.entity';
import {
  ApplicationRepository,
  FindAllApplicationsOptions,
} from '../../../../domain/applications/repositories/application.repository';
import { ApplicationMapper } from '../mappers/application.mapper';
import { PrismaService } from '../prisma.service';

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

  async findAll(
    userId: string,
    options?: FindAllApplicationsOptions,
  ): Promise<Application[]> {
    const records = await this.prisma.application.findMany({
      where: {
        userId,
        ...(options?.includeDeleted ? {} : { deletedAt: null }),
      },
      include: { files: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => ApplicationMapper.toDomain(record));
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
