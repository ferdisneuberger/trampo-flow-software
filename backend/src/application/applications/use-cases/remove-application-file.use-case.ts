import { Injectable } from '@nestjs/common';
import { Application } from '../../../domain/applications/entities/application.entity';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';
import { StorageService } from '../../../infrastructure/storage/storage.service';
import { ApplicationAlreadyDeletedError } from '../errors/application-already-deleted.error';
import { ApplicationNotFoundError } from '../errors/application-not-found.error';
import { ApplicationError } from '../../shared/errors/application.error';

export type RemoveApplicationFileInput = {
  userId: string;
  applicationId: string;
  fileId: string;
};

@Injectable()
export class RemoveApplicationFileUseCase {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(input: RemoveApplicationFileInput): Promise<Application> {
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

    const file = application.files.find((item) => item.id === input.fileId);

    if (!file) {
      throw new ApplicationError(
        `File "${input.fileId}" was not found.`,
        'FILE_NOT_FOUND',
      );
    }

    application.removeFile(input.fileId);

    await this.applicationRepository.update(application, input.userId);

    if (file.storageKey) {
      await this.storage.removeObject(file.storageKey).catch(() => undefined);
    }

    return application;
  }
}
