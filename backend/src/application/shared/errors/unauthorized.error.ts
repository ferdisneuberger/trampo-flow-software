import { ApplicationError } from './application.error';

export class UnauthorizedError extends ApplicationError {
  constructor(message = 'Usuário ou senha inválidos.', code = 'UNAUTHORIZED') {
    super(message, code);
    this.name = 'UnauthorizedError';
  }
}
