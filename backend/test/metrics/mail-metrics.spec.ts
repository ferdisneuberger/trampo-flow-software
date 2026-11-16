import type { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { sendMailInBackground } from '../../src/application/auth/services/send-mail-in-background';
import {
  Mailer,
  MailerDisabledError,
  type MailMessage,
} from '../../src/domain/auth/services/mailer';
import { SpyAppMetrics } from '../helpers/spy-app-metrics';

const message: MailMessage = {
  to: 'a@b.com',
  subject: 'x',
  html: '<p>x</p>',
  text: 'x',
};
const loggerError = vi.fn();
const logger = { error: loggerError } as unknown as Logger;

class FakeMailer extends Mailer {
  constructor(private readonly outcome: 'ok' | 'error' | 'disabled') {
    super();
  }

  send(): Promise<void> {
    if (this.outcome === 'ok') return Promise.resolve();
    return Promise.reject(
      this.outcome === 'disabled'
        ? new MailerDisabledError()
        : new Error('smtp caiu'),
    );
  }
}

async function run(
  outcome: 'ok' | 'error' | 'disabled',
  template = 'verification' as const,
) {
  const metrics = new SpyAppMetrics();

  sendMailInBackground(new FakeMailer(outcome), message, logger, 'contexto', {
    template,
    metrics,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  return metrics.of('mailSent');
}

describe('métricas de e-mail', () => {
  it('ok, erro e desligado, com a duração e sem o endereço', async () => {
    const [ok] = await run('ok');
    const [failed] = await run('error', 'password_reset' as never);
    const [disabled] = await run('disabled');

    expect(ok?.slice(0, 2)).toEqual(['verification', 'ok']);
    expect(failed?.slice(0, 2)).toEqual(['password_reset', 'error']);
    expect(disabled?.slice(0, 2)).toEqual(['verification', 'disabled']);
    expect(typeof ok?.[2]).toBe('number');
    expect(JSON.stringify([ok, failed, disabled])).not.toContain('a@b.com');
  });

  it('o erro continua indo para o log', async () => {
    await run('error');

    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('smtp caiu'),
    );
  });

  it('sem instrumentação o envio funciona como antes', async () => {
    sendMailInBackground(new FakeMailer('ok'), message, logger, 'contexto');
    sendMailInBackground(new FakeMailer('error'), message, logger, 'contexto');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loggerError).toHaveBeenCalled();
  });
});
