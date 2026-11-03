export class AuthSettings {
  constructor(
    public readonly registrationEnabled: boolean,
    public readonly verificationTtlMs: number,
    public readonly resendCooldownMs: number,
    public readonly passwordResetTtlMs: number,
    public readonly termsVersion: string,
    public readonly appBaseUrl: string,
  ) {}
}
