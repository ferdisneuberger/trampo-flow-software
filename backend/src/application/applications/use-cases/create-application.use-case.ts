import { Injectable } from '@nestjs/common';
import {
  Application,
  CreateApplicationProps,
} from '../../../domain/applications/entities/application.entity';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';

export type CreateApplicationInput = CreateApplicationProps & {
  userId: string;
};

@Injectable()
export class CreateApplicationUseCase {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(input: CreateApplicationInput): Promise<Application> {
    const application = Application.create(input);

    await this.applicationRepository.create(application, input.userId);

    const stored = await this.applicationRepository.findById(
      application.id,
      input.userId,
    );

    return stored ?? application;
  }
}
