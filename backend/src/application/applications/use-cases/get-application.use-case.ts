import { Injectable } from '@nestjs/common';
import { Application } from '../../../domain/applications/entities/application.entity';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';
import { ApplicationNotFoundError } from '../errors/application-not-found.error';

export type GetApplicationInput = {
  id: string;
  userId: string;
};

@Injectable()
export class GetApplicationUseCase {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(input: GetApplicationInput): Promise<Application> {
    const application = await this.applicationRepository.findById(
      input.id,
      input.userId,
    );

    if (!application) {
      throw new ApplicationNotFoundError(input.id);
    }

    return application;
  }
}
