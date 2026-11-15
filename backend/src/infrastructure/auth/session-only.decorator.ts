import { SetMetadata } from '@nestjs/common';

export const IS_SESSION_ONLY_KEY = 'isSessionOnly';

/**
 * Restringe a rota ao JWT de sessão. Tokens de integração (PAT) recebem 403,
 * o que impede, por exemplo, que um PAT crie ou revogue outros PATs.
 */
export const SessionOnly = () => SetMetadata(IS_SESSION_ONLY_KEY, true);
