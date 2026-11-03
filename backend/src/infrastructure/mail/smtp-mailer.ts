import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { Mailer, type MailMessage } from '../../domain/auth/services/mailer';

@Injectable()
export class SmtpMailer extends Mailer {
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
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP não configurado.');
    }

    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
