import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import { TokenService } from './token.service';

export type AuthenticatedUser = {
  username: string;
};

export type LoginResult = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthenticatedUser;
};

@Injectable()
export class AuthService {
  private readonly username: string;
  private readonly password: string;

  constructor(
    configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {
    const username = configService.get<string>('AUTH_USERNAME')?.trim();
    const password = configService.get<string>('AUTH_PASSWORD');

    if (!username || !password) {
      throw new Error(
        'AUTH_USERNAME e AUTH_PASSWORD devem ser definidos no ambiente.',
      );
    }

    if (username.length > 120) {
      throw new Error('AUTH_USERNAME deve ter no máximo 120 caracteres.');
    }

    if (password.length > 256) {
      throw new Error('AUTH_PASSWORD deve ter no máximo 256 caracteres.');
    }

    this.username = username;
    this.password = password;
  }

  login(username: string, password: string): LoginResult {
    const usernameMatches = safeEqual(this.username, username.trim());
    const passwordMatches = safeEqual(this.password, password);

    if (!usernameMatches || !passwordMatches) {
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    }

    const { token } = this.tokenService.sign(this.username);

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: this.tokenService.expiresInSeconds,
      user: { username: this.username },
    };
  }

  isCurrentUser(username: string): boolean {
    return safeEqual(this.username, username);
  }

  getProfile(username: string): AuthenticatedUser {
    return { username };
  }
}

function safeEqual(expected: string, received: string): boolean {
  const expectedDigest = createHash('sha256').update(expected, 'utf8').digest();
  const receivedDigest = createHash('sha256').update(received, 'utf8').digest();

  return timingSafeEqual(expectedDigest, receivedDigest);
}
