import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  GeneratedPersonalAccessToken,
  PERSONAL_ACCESS_TOKEN_PREFIX,
  PersonalAccessTokenGenerator,
} from '../../domain/auth/services/personal-access-token-generator';

const DISPLAY_PREFIX_LENGTH = 8;

@Injectable()
export class CryptoPersonalAccessTokenGenerator extends PersonalAccessTokenGenerator {
  generate(): GeneratedPersonalAccessToken {
    const token = `${PERSONAL_ACCESS_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;

    return { token, prefix: token.slice(0, DISPLAY_PREFIX_LENGTH) };
  }
}
