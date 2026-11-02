import { Injectable } from '@nestjs/common';
import { Application } from '../../../domain/applications/entities/application.entity';
import { ApplicationStatus } from '../../../domain/applications/enums/application-status.enum';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';

export const BOARD_STATUSES = [
  ApplicationStatus.PENDING,
  ApplicationStatus.IN_PROGRESS,
  ApplicationStatus.COMPLETED,
  ApplicationStatus.REJECTED,
] as const;

export const DEFAULT_COLUMN_SIZE = 50;

export type BoardColumn = {
  status: ApplicationStatus;
  total: number;
  items: Application[];
  hasMore: boolean;
};

export type ApplicationBoard = {
  columns: BoardColumn[];
};

export type GetBoardInput = {
  userId: string;
  limitPerColumn?: number;
  search?: string;
};

@Injectable()
export class GetBoardUseCase {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(input: GetBoardInput): Promise<ApplicationBoard> {
    const limit = input.limitPerColumn ?? DEFAULT_COLUMN_SIZE;
    const search = input.search?.trim();
    const counts = await this.applicationRepository.countByStatus(input.userId);

    const columns = await Promise.all(
      BOARD_STATUSES.map(async (status) => {
        const items = await this.applicationRepository.findBoardColumn(
          input.userId,
          status,
          { limit, search: search ? search : undefined },
        );

        return {
          status,
          total: counts[status],
          items,
          hasMore: items.length === limit,
        };
      }),
    );

    return { columns };
  }
}
