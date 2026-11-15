import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  ACCESS_TOKEN_PREFIX,
  DCR_CLIENT_ID_PREFIX,
  OAuthTokenGenerator,
  REFRESH_TOKEN_PREFIX,
} from '../../domain/oauth/services/oauth-token-generator';

const secret = () => randomBytes(32).toString('base64url');

@Injectable()
export class CryptoOAuthTokenGenerator extends OAuthTokenGenerator {
  accessToken(): string {
    return `${ACCESS_TOKEN_PREFIX}${secret()}`;
  }

  refreshToken(): string {
    return `${REFRESH_TOKEN_PREFIX}${secret()}`;
  }

  authorizationCode(): string {
    return secret();
  }

  clientId(): string {
    return `${DCR_CLIENT_ID_PREFIX}${randomBytes(16).toString('base64url')}`;
  }
}
