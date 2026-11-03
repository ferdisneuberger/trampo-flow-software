import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type RateLimitEntry = {
  timestamps: number[];
};

@Injectable()
export class RateLimiterService {
  private readonly entries = new Map<string, RateLimitEntry>();

  consume(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const entry = this.entries.get(key) ?? { timestamps: [] };
    const timestamps = entry.timestamps.filter(
      (timestamp) => now - timestamp < windowMs,
    );

    if (timestamps.length >= limit) {
      const oldest = timestamps[0] ?? now;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldest + windowMs - now) / 1000),
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'RATE_LIMITED',
          message: `Muitas tentativas. Tente novamente em ${retryAfterSeconds} segundos.`,
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    timestamps.push(now);
    this.entries.set(key, { timestamps });

    if (this.entries.size > 10_000) {
      this.prune(now);
    }
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (
        entry.timestamps.length === 0 ||
        now - entry.timestamps[entry.timestamps.length - 1] > 60 * 60 * 1000
      ) {
        this.entries.delete(key);
      }
    }
  }
}
