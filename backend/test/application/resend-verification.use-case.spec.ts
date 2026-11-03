import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuthSettings } from '../../src/application/auth/services/auth-settings';
import { ResendVerificationUseCase } from '../../src/application/auth/use-cases/resend-verification.use-case';
import { AuthToken } from '../../src/domain/auth/entities/auth-token.entity';
import {
  Mailer,
  type MailMessage,
} from '../../src/domain/auth/services/mailer';
import { TokenHasher } from '../../src/domain/auth/services/token-hasher';
import { VerificationCodeGenerator } from '../../src/domain/auth/services/verification-code-generator';
import { UnauthorizedError } from '../../src/application/shared/errors/unauthorized.error';
import { User } from '../../src/domain/users/entities/user.entity';
import { InMemoryAuthTokenRepository } from '../repositories/in-memory-auth-token.repository';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';

function makeSettings(): AuthSettings {
  return new AuthSettings(
    true,
    24 * 60 * 60 * 1000,
    120 * 1000,
    '2026-11',
    'https://app.exemplo.com',
  );
}

async function setup(
  options: { verified?: boolean; tokenAgeMs?: number } = {},
) {
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryAuthTokenRepository();
  const user = User.create({
    email: 'pessoa@exemplo.com',
    passwordHash: PASSWORD_HASH,
  });

  if (options.verified) {
    user.markEmailVerified(new Date('2026-01-01T00:00:00.000Z'));
  }

  await users.create(user);

  if (options.tokenAgeMs !== undefined) {
    const createdAt = new Date(Date.now() - options.tokenAgeMs);
    await tokens.create(
      AuthToken.restore({
        id: '4f1d2c3b-5a60-4e7f-8a9b-0c1d2e3f4a5b',
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
        tokenHash: 'a'.repeat(64),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
        createdAt,
      }),
    );
  }

  const sendMail = vi
    .fn<(message: MailMessage) => Promise<void>>()
    .mockResolvedValue(undefined);
  const mailer = { send: sendMail } as unknown as Mailer;
  const codeGenerator = {
    generate: vi.fn().mockReturnValue('ADK-7YP'),
  } as unknown as VerificationCodeGenerator;
  const tokenHasher = {
    hash: vi.fn((value: string) => `hash:${value}`),
  } as unknown as TokenHasher;

  const useCase = new ResendVerificationUseCase(
    users,
    tokens,
    codeGenerator,
    tokenHasher,
    mailer,
    makeSettings(),
  );

  return { useCase, users, tokens, user, sendMail };
}

describe('ResendVerificationUseCase', () => {
  it('reenvia e cria um novo token', async () => {
    const context = await setup();

    const result = await context.useCase.execute(context.user.id);

    expect(result).toEqual({ sent: true, retryAfterSeconds: 120 });
    expect(await context.tokens.findByHash('hash:ADK-7YP')).not.toBeNull();
    expect(context.sendMail).toHaveBeenCalledOnce();
  });

  it('respeita o cooldown sem enviar de novo', async () => {
    const context = await setup({ tokenAgeMs: 30_000 });

    const result = await context.useCase.execute(context.user.id);

    expect(result.sent).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(89);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(90);
    expect(context.sendMail).not.toHaveBeenCalled();
  });

  it('não envia para usuário já verificado', async () => {
    const context = await setup({ verified: true });

    const result = await context.useCase.execute(context.user.id);

    expect(result).toEqual({ sent: false, retryAfterSeconds: 0 });
    expect(context.sendMail).not.toHaveBeenCalled();
  });

  it('rejeita usuário inexistente', async () => {
    const context = await setup();

    await expect(
      context.useCase.execute('00000000-0000-0000-0000-000000000000'),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('mantém o reenvio quando o SMTP falha', async () => {
    const context = await setup();
    const logger = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    context.sendMail.mockRejectedValueOnce(new Error('SMTP fora do ar'));

    await expect(context.useCase.execute(context.user.id)).resolves.toEqual({
      sent: true,
      retryAfterSeconds: 120,
    });
    expect(logger).toHaveBeenCalled();

    logger.mockRestore();
  });
});
