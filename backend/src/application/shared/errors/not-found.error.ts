import { ApplicationError } from './application.error';

export class NotFoundError extends ApplicationError {
  constructor(message: string, code = 'NOT_FOUND') {
    super(message, code);
    this.name = 'NotFoundError';
  }
}
