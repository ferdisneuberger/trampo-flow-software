import { Injectable } from '@nestjs/common';
import { Application } from '../../../domain/applications/entities/application.entity';
import { CreateApplicationFileInput } from '../../../domain/applications/entities/application-file.entity';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';
import { ApplicationAlreadyDeletedError } from '../errors/application-already-deleted.error';
import { ApplicationNotFoundError } from '../errors/application-not-found.error';

export type AddApplicationFilesInput = {
  applicationId: string;
  userId: string;
  files: CreateApplicationFileInput[];
};

@Injectable()
export class AddApplicationFilesUseCase {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(input: AddApplicationFilesInput): Promise<Application> {
    const application = await this.applicationRepository.findById(
      input.applicationId,
      input.userId,
    );

    if (!application) {
      throw new ApplicationNotFoundError(input.applicationId);
    }

    if (application.isDeleted) {
      throw new ApplicationAlreadyDeletedError(input.applicationId);
    }

    application.addFiles(input.files);

    await this.applicationRepository.update(application, input.userId);

    const stored = await this.applicationRepository.findById(
      application.id,
      input.userId,
    );

    return stored ?? application;
  }
}
