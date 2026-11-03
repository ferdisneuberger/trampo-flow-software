import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { Mailer, type MailMessage } from '../../domain/auth/services/mailer';

type SmtpError = Error & {
  code?: string;
  responseCode?: number;
  command?: string;
};

function maskEmail(value: string): string {
  const at = value.lastIndexOf('@');

  if (at <= 0) {
    return '***';
  }

  return `${value[0]}***${value.slice(at)}`;
}

@Injectable()
export class SmtpMailer extends Mailer {
  private readonly logger = new Logger(SmtpMailer.name);
  private readonly transporter: Transporter | null;
  private readonly from: { name: string; address: string };

  constructor(configService: ConfigService) {
    super();

    const host = configService.get<string>('SMTP_HOST')?.trim();
    const port = Number(configService.get<string>('SMTP_PORT') ?? 587);
    const secure = configService.get<string>('SMTP_SECURE') === 'true';
    const user = configService.get<string>('SMTP_USER')?.trim();
    const pass = configService.get<string>('SMTP_PASS');
    const fromAddress =
      configService.get<string>('MAIL_FROM')?.trim() ?? user ?? '';
    const fromName =
      configService.get<string>('MAIL_FROM_NAME')?.trim() ?? 'Trampo Flow';

    this.from = { name: fromName, address: fromAddress };
    this.transporter = host
      ? createTransport({
          host,
          port: Number.isInteger(port) ? port : 587,
          secure,
          auth: user
            ? {
                user,
                pass: pass?.replace(/\s+/g, '') ?? '',
              }
            : undefined,
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
        })
      : null;

    if (!this.transporter) {
      this.logger.warn(
        'SMTP_HOST não configurado; o envio de e-mails está desabilitado.',
      );
      return;
    }

    this.logger.log(
      `SMTP configurado: host=${host} port=${port} secure=${secure} user=${maskEmail(
        user ?? '',
      )} from=${maskEmail(fromAddress)}.`,
    );
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP não configurado.');
    }

    this.logger.log(
      `Enviando e-mail "${message.subject}" para ${maskEmail(message.to)}.`,
    );

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      this.logger.log(
        `E-mail enviado: id=${info.messageId ?? 'n/a'} accepted=${
          info.accepted?.length ?? 0
        } rejected=${info.rejected?.length ?? 0}.`,
      );
    } catch (error) {
      const smtpError = error as SmtpError;

      this.logger.error(
        `Falha no envio SMTP: code=${smtpError.code ?? 'n/a'} responseCode=${
          smtpError.responseCode ?? 'n/a'
        } command=${smtpError.command ?? 'n/a'} message=${
          smtpError.message ?? 'erro desconhecido'
        }`,
      );

      throw error;
    }
  }
}
