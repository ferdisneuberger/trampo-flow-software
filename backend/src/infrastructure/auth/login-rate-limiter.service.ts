import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type AttemptState = {
  failures: number;
  lastAttemptAt: number;
  blockedUntil: number;
};

@Injectable()
export class LoginRateLimiter {
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private state: AttemptState | null = null;

  constructor(configService: ConfigService) {
    this.maxFailures = readPositiveInt(
      configService.get<string>('LOGIN_MAX_ATTEMPTS'),
      10,
    );
    this.windowMs =
      readPositiveInt(
        configService.get<string>('LOGIN_WINDOW_SECONDS'),
        2 * 60,
      ) * 1000;
  }

  assertAllowed(): void {
    const now = Date.now();
    const state = this.state;

    if (!state) {
      return;
    }

    if (state.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((state.blockedUntil - now) / 1000);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'TOO_MANY_ATTEMPTS',
          message: `Muitas tentativas de login. Tente novamente em ${retryAfterSeconds} segundos.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (state.blockedUntil > 0 || now - state.lastAttemptAt > this.windowMs) {
      this.state = null;
    }
  }

  registerFailure(): void {
    const now = Date.now();
    const current = this.state;
    const failures =
      current &&
      current.blockedUntil <= now &&
      now - current.lastAttemptAt <= this.windowMs
        ? current.failures + 1
        : 1;

    this.state = {
      failures,
      lastAttemptAt: now,
      blockedUntil: failures >= this.maxFailures ? now + this.windowMs : 0,
    };
  }

  registerSuccess(): void {
    this.state = null;
  }
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
