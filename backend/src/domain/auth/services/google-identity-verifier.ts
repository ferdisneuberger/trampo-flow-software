export type GoogleIdentity = {
  googleId: string;
  email: string;
  emailVerified: boolean;
};

export abstract class GoogleIdentityVerifier {
  abstract verify(credential: string): Promise<GoogleIdentity>;
}
