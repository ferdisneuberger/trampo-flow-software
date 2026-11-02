import { Injectable } from '@nestjs/common';
import { Application } from '../../../domain/applications/entities/application.entity';
import { ApplicationStatus } from '../../../domain/applications/enums/application-status.enum';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';
import { ApplicationError } from '../../shared/errors/application.error';
import { ApplicationAlreadyDeletedError } from '../errors/application-already-deleted.error';
import { ApplicationNotFoundError } from '../errors/application-not-found.error';

export const POSITION_GAP = 1000;

export type PlaceApplicationCommand = {
  userId: string;
  applicationId: string;
  status?: ApplicationStatus;
  beforeId?: string;
  afterId?: string;
};

@Injectable()
export class PlaceApplicationUseCase {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(input: PlaceApplicationCommand): Promise<Application> {
    const application = await this.applicationRepository.findById(
      input.applicationId,
      input.userId,
    );

    if (!application) {
      throw new ApplicationNotFoundError(input.applicationId);
    }

    if (application.isDeleted) {
      throw new ApplicationAlreadyDeletedError(input.applicationId);
    }

    const status = input.status ?? application.status;
    const before = await this.loadNeighbor(
      input.beforeId,
      input.userId,
      status,
      'beforeId',
    );
    const after = await this.loadNeighbor(
      input.afterId,
      input.userId,
      status,
      'afterId',
    );

    let beforePosition = before?.position ?? null;
    let afterPosition = after?.position ?? null;

    if (
      beforePosition !== null &&
      afterPosition !== null &&
      afterPosition - beforePosition < 2
    ) {
      await this.applicationRepository.reindexStatus(input.userId, status);

      const reloadedBefore = before
        ? await this.applicationRepository.findById(before.id, input.userId)
        : null;
      const reloadedAfter = after
        ? await this.applicationRepository.findById(after.id, input.userId)
        : null;

      beforePosition = reloadedBefore?.position ?? null;
      afterPosition = reloadedAfter?.position ?? null;
    }

    const position = await this.calculatePosition(
      input,
      status,
      beforePosition,
      afterPosition,
    );

    await this.applicationRepository.place({
      applicationId: input.applicationId,
      userId: input.userId,
      status,
      position,
    });

    const updated = await this.applicationRepository.findById(
      input.applicationId,
      input.userId,
    );

    if (!updated) {
      throw new ApplicationNotFoundError(input.applicationId);
    }

    return updated;
  }

  private async loadNeighbor(
    id: string | undefined,
    userId: string,
    status: ApplicationStatus,
    field: 'beforeId' | 'afterId',
  ): Promise<Application | null> {
    if (!id) {
      return null;
    }

    const neighbor = await this.applicationRepository.findById(id, userId);

    if (!neighbor || neighbor.status !== status) {
      throw new ApplicationError(
        `O campo "${field}" precisa apontar para uma candidatura do mesmo status.`,
        'INVALID_PLACEMENT',
      );
    }

    return neighbor;
  }

  private async calculatePosition(
    input: PlaceApplicationCommand,
    status: ApplicationStatus,
    beforePosition: number | null,
    afterPosition: number | null,
  ): Promise<number> {
    if (beforePosition !== null && afterPosition !== null) {
      return Math.floor((beforePosition + afterPosition) / 2);
    }

    if (beforePosition !== null) {
      return beforePosition + POSITION_GAP;
    }

    if (afterPosition !== null) {
      return afterPosition - POSITION_GAP;
    }

    const maxPosition = await this.applicationRepository.findMaxPosition(
      input.userId,
      status,
    );

    return maxPosition + POSITION_GAP;
  }
}
