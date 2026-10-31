import { ApplicationError } from './application.error';

export class ConflictError extends ApplicationError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, code);
    this.name = 'ConflictError';
  }
}
