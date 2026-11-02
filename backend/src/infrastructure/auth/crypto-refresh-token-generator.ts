import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  GeneratedRefreshToken,
  RefreshTokenGenerator,
} from '../../domain/auth/services/refresh-token-generator';

@Injectable()
export class CryptoRefreshTokenGenerator extends RefreshTokenGenerator {
  generate(): GeneratedRefreshToken {
    const token = randomBytes(32).toString('base64url');

    return { token, hash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
