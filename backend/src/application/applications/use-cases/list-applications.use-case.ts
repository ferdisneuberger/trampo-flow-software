import { Injectable } from '@nestjs/common';
import { Application } from '../../../domain/applications/entities/application.entity';
import { ApplicationStatus } from '../../../domain/applications/enums/application-status.enum';
import {
  ApplicationCursor,
  ApplicationRepository,
  ApplicationSort,
} from '../../../domain/applications/repositories/application.repository';

export const DEFAULT_PAGE_SIZE = 25;

export type ListApplicationsInput = {
  userId: string;
  limit?: number;
  sort?: ApplicationSort;
  search?: string;
  status?: ApplicationStatus;
  cursor?: ApplicationCursor;
};

export type ListApplicationsOutput = {
  items: Application[];
  nextCursor: ApplicationCursor | null;
};

@Injectable()
export class ListApplicationsUseCase {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(input: ListApplicationsInput): Promise<ListApplicationsOutput> {
    const limit = input.limit ?? DEFAULT_PAGE_SIZE;
    const sort = input.sort ?? 'recent';
    const search = input.search?.trim();

    const rows = await this.applicationRepository.findPage(input.userId, {
      limit: limit + 1,
      sort,
      search: search ? search : undefined,
      status: input.status,
      cursor: input.cursor,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items.at(-1);

    return {
      items,
      nextCursor:
        hasMore && last
          ? {
              sort,
              value: sort === 'recent' ? last.createdAt : last.updatedAt,
              id: last.id,
            }
          : null,
    };
  }
}
