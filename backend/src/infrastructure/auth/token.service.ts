import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const JWT_ALGORITHM = 'HS256';
const JWT_TYPE = 'JWT';
const JWT_ISSUER = 'trampo-flow-api';
const JWT_AUDIENCE = 'trampo-flow-web';
const MIN_SECRET_LENGTH = 32;
const MAX_TOKEN_LENGTH = 4096;
const MAX_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const CLOCK_TOLERANCE_SECONDS = 5;

type JwtHeader = {
  alg: typeof JWT_ALGORITHM;
  typ: typeof JWT_TYPE;
};

export type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
  iss: typeof JWT_ISSUER;
  aud: typeof JWT_AUDIENCE;
  jti: string;
};

export type SignedToken = {
  token: string;
  expiresAt: number;
};

@Injectable()
export class TokenService {
  private readonly secret: string;
  private readonly ttlSeconds: number;

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET')?.trim();

    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `JWT_SECRET deve ter pelo menos ${MIN_SECRET_LENGTH} caracteres.`,
      );
    }

    this.secret = secret;
    this.ttlSeconds = parseExpiresIn(
      configService.get<string>('JWT_EXPIRES_IN') ?? '8h',
    );
  }

  get expiresInSeconds(): number {
    return this.ttlSeconds;
  }

  sign(username: string): SignedToken {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + this.ttlSeconds;
    const header: JwtHeader = { alg: JWT_ALGORITHM, typ: JWT_TYPE };
    const payload: JwtPayload = {
      sub: username,
      iat: issuedAt,
      exp: expiresAt,
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
      jti: randomUUID(),
    };

    const encodedHeader = encodeSegment(header);
    const encodedPayload = encodeSegment(payload);
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = this.createSignature(signingInput);

    return {
      token: `${signingInput}.${signature}`,
      expiresAt,
    };
  }

  verify(token: string): JwtPayload {
    if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
      throw invalidToken();
    }

    const parts = token.split('.');

    if (parts.length !== 3) {
      throw invalidToken();
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw invalidToken();
    }

    const header = decodeSegment<Record<string, unknown>>(encodedHeader);

    if (header.alg !== JWT_ALGORITHM || header.typ !== JWT_TYPE) {
      throw invalidToken();
    }

    const expectedSignature = Buffer.from(
      this.createSignature(`${encodedHeader}.${encodedPayload}`),
      'base64url',
    );
    const receivedSignature = Buffer.from(encodedSignature, 'base64url');

    if (
      expectedSignature.length !== receivedSignature.length ||
      !timingSafeEqual(expectedSignature, receivedSignature)
    ) {
      throw invalidToken();
    }

    const payload = decodeSegment<Record<string, unknown>>(encodedPayload);
    const subject = payload.sub;
    const issuedAt = payload.iat;
    const expiresAt = payload.exp;
    const tokenId = payload.jti;

    if (
      typeof subject !== 'string' ||
      subject.length === 0 ||
      subject.length > 120 ||
      typeof issuedAt !== 'number' ||
      !Number.isInteger(issuedAt) ||
      typeof expiresAt !== 'number' ||
      !Number.isInteger(expiresAt) ||
      typeof tokenId !== 'string' ||
      tokenId.length === 0 ||
      payload.iss !== JWT_ISSUER ||
      payload.aud !== JWT_AUDIENCE
    ) {
      throw invalidToken();
    }

    const now = Math.floor(Date.now() / 1000);

    if (
      issuedAt > now + CLOCK_TOLERANCE_SECONDS ||
      expiresAt <= now - CLOCK_TOLERANCE_SECONDS ||
      expiresAt <= issuedAt ||
      expiresAt - issuedAt > MAX_TOKEN_TTL_SECONDS
    ) {
      throw invalidToken();
    }

    return {
      sub: subject,
      iat: issuedAt,
      exp: expiresAt,
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
      jti: tokenId,
    };
  }

  private createSignature(signingInput: string): string {
    return createHmac('sha256', this.secret)
      .update(signingInput)
      .digest('base64url');
  }
}

function encodeSegment(value: object): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeSegment<T>(encoded: string): T {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    );

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error('Segmento JWT inválido.');
    }

    return parsed as T;
  } catch {
    throw invalidToken();
  }
}

function invalidToken(): UnauthorizedException {
  return new UnauthorizedException('Token inválido ou expirado.');
}

function parseExpiresIn(value: string): number {
  const match = /^(\d+)([smhd])?$/i.exec(value.trim());

  if (!match) {
    throw new Error('JWT_EXPIRES_IN deve ser uma duração como 30m, 8h ou 7d.');
  }

  const amount = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
  };
  const seconds = amount * multipliers[unit];

  if (
    !Number.isSafeInteger(seconds) ||
    seconds <= 0 ||
    seconds > MAX_TOKEN_TTL_SECONDS
  ) {
    throw new Error(
      `JWT_EXPIRES_IN deve estar entre 1 segundo e ${MAX_TOKEN_TTL_SECONDS} segundos.`,
    );
  }

  return seconds;
}
