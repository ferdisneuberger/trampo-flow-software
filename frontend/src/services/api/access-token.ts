export const AUTH_UNAUTHORIZED_EVENT = 'trampo-flow:unauthorized';

let currentAccessToken: string | null = null;

export const accessTokenStore = {
  get(): string | null {
    return currentAccessToken;
  },

  set(token: string): void {
    currentAccessToken = token;
  },

  clear(): void {
    currentAccessToken = null;
  },
};
