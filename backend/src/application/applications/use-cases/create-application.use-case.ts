import { Injectable } from '@nestjs/common';
import {
  Application,
  CreateApplicationProps,
} from '../../../domain/applications/entities/application.entity';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';
import { UserRepository } from '../../../domain/users/repositories/user.repository';
import { ForbiddenError } from '../../shared/errors/forbidden.error';

export type CreateApplicationInput = CreateApplicationProps & {
  userId: string;
};

@Injectable()
export class CreateApplicationUseCase {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: CreateApplicationInput): Promise<Application> {
    const user = await this.userRepository.findById(input.userId);

    if (!user || !user.isEmailVerified) {
      throw new ForbiddenError(
        'Confirme seu e-mail para criar candidaturas.',
        'EMAIL_NOT_VERIFIED',
      );
    }

    const application = Application.create(input);

    await this.applicationRepository.create(application, input.userId);

    const stored = await this.applicationRepository.findById(
      application.id,
      input.userId,
    );

    return stored ?? application;
  }
}
