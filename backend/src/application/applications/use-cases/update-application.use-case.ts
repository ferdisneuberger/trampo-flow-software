import { Injectable } from '@nestjs/common';
import {
  Application,
  UpdateApplicationProps,
} from '../../../domain/applications/entities/application.entity';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';
import { ApplicationAlreadyDeletedError } from '../errors/application-already-deleted.error';
import { ApplicationNotFoundError } from '../errors/application-not-found.error';

export type UpdateApplicationInput = UpdateApplicationProps & {
  id: string;
};

@Injectable()
export class UpdateApplicationUseCase {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(input: UpdateApplicationInput): Promise<Application> {
    const application = await this.applicationRepository.findById(input.id);

    if (!application) {
      throw new ApplicationNotFoundError(input.id);
    }

    if (application.isDeleted) {
      throw new ApplicationAlreadyDeletedError(input.id);
    }

    application.updateDetails({
      title: input.title,
      link: input.link,
      currentPhase: input.currentPhase,
      status: input.status,
    });

    await this.applicationRepository.update(application);

    return application;
  }
}
