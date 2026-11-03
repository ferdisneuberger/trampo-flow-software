export type AuthUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  termsAccepted: boolean;
  verificationResendAvailableAt: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  termsAccepted: boolean;
};

export type VerifyEmailInput = {
  token: string;
};

export type ResendVerificationResponse = {
  sent: boolean;
  retryAfterSeconds: number;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export type GoogleLoginInput = {
  credential: string;
  termsAccepted?: boolean;
};

export type RegisterResponse = {
  message: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: number;
  user: AuthUser;
};

export type RefreshResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: number;
};
