import { Injectable } from '@nestjs/common';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';
import { ApplicationAlreadyDeletedError } from '../errors/application-already-deleted.error';
import { ApplicationNotFoundError } from '../errors/application-not-found.error';
import {
  ApplicationDeleteMode,
  isApplicationDeleteMode,
} from '../types/application-delete-mode';
import { ApplicationError } from '../../shared/errors/application.error';

export type DeleteApplicationInput = {
  id: string;
  mode?: ApplicationDeleteMode;
};

@Injectable()
export class DeleteApplicationUseCase {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
  ) {}

  async execute(input: DeleteApplicationInput): Promise<void> {
    const mode = input.mode ?? 'soft';

    if (!isApplicationDeleteMode(mode)) {
      throw new ApplicationError(
        `Delete mode must be "soft" or "hard", received "${String(mode)}".`,
        'INVALID_DELETE_MODE',
      );
    }

    const application = await this.applicationRepository.findById(input.id);

    if (!application) {
      throw new ApplicationNotFoundError(input.id);
    }

    if (mode === 'soft') {
      if (application.isDeleted) {
        throw new ApplicationAlreadyDeletedError(input.id);
      }

      application.softDelete();

      await this.applicationRepository.update(application);

      return;
    }

    await this.applicationRepository.delete(application);
  }
}
