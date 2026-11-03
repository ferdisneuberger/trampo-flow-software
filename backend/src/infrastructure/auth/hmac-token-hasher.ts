import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { TokenHasher } from '../../domain/auth/services/token-hasher';

const MIN_SECRET_LENGTH = 32;

@Injectable()
export class HmacTokenHasher extends TokenHasher {
  private readonly secret: string;

  constructor(configService: ConfigService) {
    super();

    const secret = configService.get<string>('AUTH_TOKEN_SECRET')?.trim();

    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `AUTH_TOKEN_SECRET deve ter pelo menos ${MIN_SECRET_LENGTH} caracteres.`,
      );
    }

    this.secret = secret;
  }

  hash(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }
}
