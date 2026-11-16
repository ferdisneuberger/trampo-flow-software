import type { Logger } from '@nestjs/common';
import {
  MailerDisabledError,
  type Mailer,
  type MailMessage,
} from '../../../domain/auth/services/mailer';
import type {
  AppMetrics,
  MailTemplate,
} from '../../shared/metrics/app-metrics';

export type MailInstrumentation = {
  template: MailTemplate;
  metrics: AppMetrics;
};

export function sendMailInBackground(
  mailer: Mailer,
  message: MailMessage,
  logger: Logger,
  errorContext: string,
  instrumentation?: MailInstrumentation,
): void {
  const startedAt = performance.now();
  const seconds = (): number => (performance.now() - startedAt) / 1000;

  void mailer
    .send(message)
    .then(() =>
      instrumentation?.metrics.mailSent(
        instrumentation.template,
        'ok',
        seconds(),
      ),
    )
    .catch((error: unknown) => {
      instrumentation?.metrics.mailSent(
        instrumentation.template,
        error instanceof MailerDisabledError ? 'disabled' : 'error',
        seconds(),
      );

      logger.error(
        `${errorContext}: ${
          error instanceof Error ? error.message : 'erro desconhecido'
        }`,
      );
    });
}
