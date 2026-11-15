import { SetMetadata } from '@nestjs/common';

export const IS_OAUTH_ROUTE_KEY = 'isOAuthRoute';

/**
 * Marca as rotas do servidor de autorização. Sem `OAUTH_ENABLED` o guard
 * responde 404, antes de qualquer outra checagem: nada novo fica exposto.
 */
export const OAuthRoute = () => SetMetadata(IS_OAUTH_ROUTE_KEY, true);
