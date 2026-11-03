export type AuthUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
  termsAccepted: boolean;
};

export type LoginInput = {
  email: string;
  password: string;
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
