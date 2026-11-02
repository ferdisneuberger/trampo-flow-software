import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { ApplicationFile } from '../../../domain/applications/entities/application-file.entity';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';
import { StorageService } from '../../../infrastructure/storage/storage.service';
import { ApplicationError } from '../../shared/errors/application.error';
import { ApplicationNotFoundError } from '../errors/application-not-found.error';

export type DownloadApplicationFileInput = {
  userId: string;
  applicationId: string;
  fileId: string;
};

export type DownloadResult = {
  file: ApplicationFile;
  stream: Readable;
};

@Injectable()
export class DownloadApplicationFileUseCase {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(input: DownloadApplicationFileInput): Promise<DownloadResult> {
    const application = await this.applicationRepository.findById(
      input.applicationId,
      input.userId,
    );

    if (!application) {
      throw new ApplicationNotFoundError(input.applicationId);
    }

    const file = application.files.find((item) => item.id === input.fileId);

    if (!file) {
      throw new ApplicationError(
        `File "${input.fileId}" was not found.`,
        'FILE_NOT_FOUND',
      );
    }

    if (!file.storageKey) {
      throw new ApplicationError(
        'Este arquivo é um link externo e não possui download.',
        'FILE_NOT_STORED',
      );
    }

    return {
      file,
      stream: await this.storage.getObject(file.storageKey),
    };
  }
}
