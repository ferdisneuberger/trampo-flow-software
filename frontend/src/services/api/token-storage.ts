const TOKEN_KEY = 'trampo-flow.token';

export const AUTH_UNAUTHORIZED_EVENT = 'trampo-flow:unauthorized';

export const tokenStorage = {
  get(): string | null {
    return window.localStorage.getItem(TOKEN_KEY);
  },

  set(token: string): void {
    window.localStorage.setItem(TOKEN_KEY, token);
  },

  clear(): void {
    window.localStorage.removeItem(TOKEN_KEY);
  },
};
