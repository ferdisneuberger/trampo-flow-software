import { createHash } from 'node:crypto';
import {
  GeneratedRefreshToken,
  RefreshTokenGenerator,
} from '../../src/domain/auth/services/refresh-token-generator';

export class FakeRefreshTokenGenerator implements RefreshTokenGenerator {
  private counter = 0;

  generate(): GeneratedRefreshToken {
    this.counter += 1;

    const token = `token-${this.counter}`;

    return { token, hash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
