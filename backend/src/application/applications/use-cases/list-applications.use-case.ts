import { Injectable } from '@nestjs/common';
import { Application } from '../../../domain/applications/entities/application.entity';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';

@Injectable()
export class ListApplicationsUseCase {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  execute(userId: string): Promise<Application[]> {
    return this.applicationRepository.findAll(userId);
  }
}
