export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** O envio de e-mail está desligado (sem SMTP configurado). */
export class MailerDisabledError extends Error {
  constructor() {
    super('SMTP não configurado.');
    this.name = 'MailerDisabledError';
  }
}

export abstract class Mailer {
  abstract send(message: MailMessage): Promise<void>;
}
