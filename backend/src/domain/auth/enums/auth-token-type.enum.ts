export const AUTH_TOKEN_TYPES = [
  'EMAIL_VERIFICATION',
  'PASSWORD_RESET',
] as const;

export type AuthTokenType = (typeof AUTH_TOKEN_TYPES)[number];
