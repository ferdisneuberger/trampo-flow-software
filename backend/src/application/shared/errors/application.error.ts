export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code = 'APPLICATION_ERROR',
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
