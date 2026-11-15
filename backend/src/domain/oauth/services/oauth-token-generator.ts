export const ACCESS_TOKEN_PREFIX = 'tfo_';
export const REFRESH_TOKEN_PREFIX = 'tfr_';
export const DCR_CLIENT_ID_PREFIX = 'tfc_';

export abstract class OAuthTokenGenerator {
  /** `tfo_…`: 32 bytes aleatórios em base64url. */
  abstract accessToken(): string;

  /** `tfr_…`: 32 bytes aleatórios em base64url. */
  abstract refreshToken(): string;

  /** Código de autorização: 32 bytes aleatórios em base64url. */
  abstract authorizationCode(): string;

  /** `tfc_…` para clientes registrados por DCR. */
  abstract clientId(): string;
}

export function isOAuthAccessToken(value: string): boolean {
  return value.startsWith(ACCESS_TOKEN_PREFIX);
}

export function isOAuthRefreshToken(value: string): boolean {
  return value.startsWith(REFRESH_TOKEN_PREFIX);
}
