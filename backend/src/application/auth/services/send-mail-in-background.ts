import type { Logger } from '@nestjs/common';
import type { Mailer, MailMessage } from '../../../domain/auth/services/mailer';

export function sendMailInBackground(
  mailer: Mailer,
  message: MailMessage,
  logger: Logger,
  errorContext: string,
): void {
  void mailer.send(message).catch((error: unknown) => {
    logger.error(
      `${errorContext}: ${
        error instanceof Error ? error.message : 'erro desconhecido'
      }`,
    );
  });
}
