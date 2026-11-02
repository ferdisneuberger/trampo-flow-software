export type GeneratedRefreshToken = {
  token: string;
  hash: string;
};

export abstract class RefreshTokenGenerator {
  abstract generate(): GeneratedRefreshToken;

  abstract hash(token: string): string;
}
