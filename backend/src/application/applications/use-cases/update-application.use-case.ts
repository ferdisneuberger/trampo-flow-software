import { Injectable, Optional } from '@nestjs/common';
import {
  Application,
  UpdateApplicationProps,
} from '../../../domain/applications/entities/application.entity';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';
import {
  AppMetrics,
  NoopAppMetrics,
  type MetricChannel,
} from '../../shared/metrics/app-metrics';
import { ApplicationAlreadyDeletedError } from '../errors/application-already-deleted.error';
import { ApplicationNotFoundError } from '../errors/application-not-found.error';

export type UpdateApplicationInput = UpdateApplicationProps & {
  id: string;
  userId: string;
  /** Como chegou (interface, token ou OAuth); só para métricas. */
  channel?: MetricChannel;
};

@Injectable()
export class UpdateApplicationUseCase {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    @Optional() private readonly metrics: AppMetrics = new NoopAppMetrics(),
  ) {}

  async execute(input: UpdateApplicationInput): Promise<Application> {
    const application = await this.applicationRepository.findById(
      input.id,
      input.userId,
    );

    if (!application) {
      throw new ApplicationNotFoundError(input.id);
    }

    if (application.isDeleted) {
      throw new ApplicationAlreadyDeletedError(input.id);
    }

    const previousStatus = application.status;
    const previousPhase = application.currentPhase;

    application.updateDetails({
      title: input.title,
      link: input.link,
      currentPhase: input.currentPhase,
      status: input.status,
    });

    await this.applicationRepository.update(application, input.userId);

    const channel = input.channel ?? 'web';

    if (application.status !== previousStatus) {
      this.metrics.applicationTransition(
        previousStatus,
        application.status,
        channel,
      );
    }

    if (application.currentPhase !== previousPhase) {
      this.metrics.applicationPhaseUpdated(channel);
    }

    const stored = await this.applicationRepository.findById(
      application.id,
      input.userId,
    );

    return stored ?? application;
  }
}
