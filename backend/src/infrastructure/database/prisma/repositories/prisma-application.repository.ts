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

  async create(application: Application): Promise<void> {
    await this.prisma.application.create({
      data: ApplicationMapper.toCreateData(application),
    });
  }

  async findById(id: string): Promise<Application | null> {
    const record = await this.prisma.application.findUnique({
      where: { id },
      include: { files: true },
    });

    return record ? ApplicationMapper.toDomain(record) : null;
  }

  async findAll(
    options?: FindAllApplicationsOptions,
  ): Promise<Application[]> {
    const records = await this.prisma.application.findMany({
      where: options?.includeDeleted ? undefined : { deletedAt: null },
      include: { files: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => ApplicationMapper.toDomain(record));
  }

  async update(application: Application): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.application.update({
        where: { id: application.id },
        data: ApplicationMapper.toUpdateData(application),
      });

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

  async delete(application: Application): Promise<void> {
    await this.prisma.application.delete({
      where: { id: application.id },
    });
  }
}
