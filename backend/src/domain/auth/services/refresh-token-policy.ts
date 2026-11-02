export class RefreshTokenPolicy {
  constructor(
    readonly ttlMs: number,
    readonly graceMs: number,
  ) {}
}
