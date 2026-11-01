import { Injectable } from '@nestjs/common';
import {
  Application,
  CreateApplicationProps,
} from '../../../domain/applications/entities/application.entity';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';

export type CreateApplicationInput = CreateApplicationProps;

@Injectable()
export class CreateApplicationUseCase {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(input: CreateApplicationInput): Promise<Application> {
    const application = Application.create(input);

    await this.applicationRepository.create(application);

    return application;
  }
}
