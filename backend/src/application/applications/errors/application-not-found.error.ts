import { NotFoundError } from '../../shared/errors/not-found.error';

export class ApplicationNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(
      `Application "${id}" was not found.`,
      'APPLICATION_NOT_FOUND',
    );
    this.name = 'ApplicationNotFoundError';
  }
}
