import type { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SmtpMailer } from '../../src/infrastructure/mail/smtp-mailer';

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  createTransport: mocks.createTransport,
}));

function createConfig(
  values: Record<string, string | undefined>,
): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

const message = {
  to: 'pessoa@exemplo.com',
  subject: 'Assunto',
  html: '<p>Olá</p>',
  text: 'Olá',
};

describe('SmtpMailer', () => {
  it('envia usando a configuração e normaliza a senha', async () => {
    const sendMail = vi.fn().mockResolvedValue({
      messageId: 'message-id',
      accepted: [message.to],
      rejected: [],
    });

    mocks.createTransport.mockReturnValue({ sendMail });

    const mailer = new SmtpMailer(
      createConfig({
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_USER: 'conta@example.com',
        SMTP_PASS: 'abcd efgh ijkl mnop',
        MAIL_FROM: 'conta@example.com',
        MAIL_FROM_NAME: 'Trampo Flow',
      }),
    );

    await mailer.send(message);

    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'conta@example.com',
          pass: 'abcdefghijklmnop',
        },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith({
      from: { name: 'Trampo Flow', address: 'conta@example.com' },
      ...message,
    });
  });

  it('recusa envio quando o host não está configurado', async () => {
    const mailer = new SmtpMailer(createConfig({}));

    await expect(mailer.send(message)).rejects.toThrow('SMTP não configurado.');
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });

  it('registra detalhes e relança quando o SMTP falha', async () => {
    const error = Object.assign(new Error('Invalid login'), {
      code: 'EAUTH',
      responseCode: 535,
      command: 'AUTH PLAIN',
    });
    const sendMail = vi.fn().mockRejectedValue(error);
    const logger = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    mocks.createTransport.mockReturnValue({ sendMail });

    const mailer = new SmtpMailer(
      createConfig({
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'conta@example.com',
        SMTP_PASS: 'segredo',
        MAIL_FROM: 'conta@example.com',
      }),
    );

    await expect(mailer.send(message)).rejects.toBe(error);
    expect(logger).toHaveBeenCalledWith(
      expect.stringContaining('code=EAUTH responseCode=535'),
    );

    logger.mockRestore();
  });
});
