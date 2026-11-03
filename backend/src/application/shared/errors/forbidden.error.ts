import { ApplicationError } from './application.error';

export class ForbiddenError extends ApplicationError {
  constructor(message = 'Acesso não permitido.', code = 'FORBIDDEN') {
    super(message, code);
    this.name = 'ForbiddenError';
  }
}
