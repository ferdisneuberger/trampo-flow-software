import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuthSettings } from '../../src/application/auth/services/auth-settings';
import { VerifyEmailUseCase } from '../../src/application/auth/use-cases/verify-email.use-case';
import { AuthToken } from '../../src/domain/auth/entities/auth-token.entity';
import {
  Mailer,
  type MailMessage,
} from '../../src/domain/auth/services/mailer';
import { TokenHasher } from '../../src/domain/auth/services/token-hasher';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import { User } from '../../src/domain/users/entities/user.entity';
import { InMemoryAuthTokenRepository } from '../repositories/in-memory-auth-token.repository';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const EMAIL = 'pessoa@exemplo.com';
const CODE = 'ADK-7YP';
const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

function makeSettings(): AuthSettings {
  return new AuthSettings(
    true,
    24 * 60 * 60 * 1000,
    120 * 1000,
    60 * 60 * 1000,
    '2026-11',
    'https://app.exemplo.com',
  );
}

async function setup(
  options: {
    verified?: boolean;
    expiresAt?: Date;
    type?: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
  } = {},
) {
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryAuthTokenRepository();
  const user = User.create({ email: EMAIL, passwordHash: PASSWORD_HASH });

  if (options.verified) {
    user.markEmailVerified(new Date('2026-01-01T00:00:00.000Z'));
  }

  await users.create(user);

  const token = AuthToken.create({
    userId: user.id,
    type: options.type ?? 'EMAIL_VERIFICATION',
    tokenHash: `hash:${CODE}`,
    expiresAt: options.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  await tokens.create(token);

  const tokenHasher = {
    hash: vi.fn((value: string) => `hash:${value}`),
  } as unknown as TokenHasher;
  const sendMail = vi
    .fn<(message: MailMessage) => Promise<void>>()
    .mockResolvedValue(undefined);
  const mailer = {
    send: sendMail,
  } as unknown as Mailer;

  const useCase = new VerifyEmailUseCase(
    users,
    tokens,
    tokenHasher,
    mailer,
    makeSettings(),
  );

  return { useCase, users, tokens, user, token, sendMail };
}

describe('VerifyEmailUseCase', () => {
  it('verifica o e-mail, consome o token e envia a confirmação', async () => {
    const { useCase, users, tokens, user, sendMail } = await setup();

    await useCase.execute({ token: ' adk-7yp ' });

    const storedUser = await users.findById(user.id);
    const storedToken = await tokens.findByHash(`hash:${CODE}`);

    expect(storedUser?.isEmailVerified).toBe(true);
    expect(storedToken?.usedAt).toBeInstanceOf(Date);
    const message = sendMail.mock.calls[0]?.[0];

    expect(message?.to).toBe(EMAIL);
    expect(message?.text).toContain('verificado com sucesso');
  });

  it('é idempotente quando o mesmo código é enviado de novo', async () => {
    const { useCase, sendMail } = await setup();

    await useCase.execute({ token: CODE });
    await useCase.execute({ token: CODE });

    expect(sendMail).toHaveBeenCalledOnce();
  });

  it('recusa código inválido', async () => {
    const { useCase } = await setup();

    await expect(useCase.execute({ token: 'XXX-XXX' })).rejects.toBeInstanceOf(
      DomainError,
    );
  });

  it('recusa código expirado', async () => {
    const { useCase } = await setup({
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(useCase.execute({ token: CODE })).rejects.toMatchObject({
      code: 'INVALID_VERIFICATION_TOKEN',
    });
  });

  it('recusa token já usado para usuário não verificado', async () => {
    const { useCase, tokens, token } = await setup();

    await tokens.markUsed(token.id, new Date());

    await expect(useCase.execute({ token: CODE })).rejects.toMatchObject({
      code: 'INVALID_VERIFICATION_TOKEN',
    });
  });

  it('recusa token de outro tipo', async () => {
    const { useCase } = await setup({ type: 'PASSWORD_RESET' });

    await expect(useCase.execute({ token: CODE })).rejects.toMatchObject({
      code: 'INVALID_VERIFICATION_TOKEN',
    });
  });

  it('confirma mesmo com usuário já verificado', async () => {
    const { useCase, tokens, token } = await setup({ verified: true });

    await useCase.execute({ token: CODE });

    const stored = await tokens.findByHash(`hash:${CODE}`);
    expect(stored?.id).toBe(token.id);
    expect(stored?.usedAt).toBeInstanceOf(Date);
  });

  it('mantém a verificação quando o envio de confirmação falha', async () => {
    const { useCase, users, user, sendMail } = await setup();
    const logger = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    sendMail.mockRejectedValueOnce(new Error('SMTP fora do ar'));

    await useCase.execute({ token: CODE });

    const stored = await users.findById(user.id);
    expect(stored?.isEmailVerified).toBe(true);
    expect(logger).toHaveBeenCalled();

    logger.mockRestore();
  });
});
