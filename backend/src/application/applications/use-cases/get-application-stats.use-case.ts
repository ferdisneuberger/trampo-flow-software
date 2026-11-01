import { Injectable } from '@nestjs/common';
import {
  ApplicationRepository,
  ApplicationStatusCount,
} from '../../../domain/applications/repositories/application.repository';

export type ApplicationStats = {
  total: number;
  byStatus: ApplicationStatusCount;
};

@Injectable()
export class GetApplicationStatsUseCase {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(userId: string): Promise<ApplicationStats> {
    const byStatus = await this.applicationRepository.countByStatus(userId);
    const total = Object.values(byStatus).reduce(
      (sum, count) => sum + count,
      0,
    );

    return { total, byStatus };
  }
}
