import { ConflictError } from '../../shared/errors/conflict.error';

export class ApplicationAlreadyDeletedError extends ConflictError {
  constructor(id: string) {
    super(
      `Application "${id}" is already deleted.`,
      'APPLICATION_ALREADY_DELETED',
    );
    this.name = 'ApplicationAlreadyDeletedError';
  }
}
