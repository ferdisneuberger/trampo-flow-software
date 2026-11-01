export type AuthUser = {
  id: string;
  username: string;
};

export type LoginInput = {
  username: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: number;
  user: AuthUser;
};
