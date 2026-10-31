export type AuthUser = {
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
  user: AuthUser;
};
