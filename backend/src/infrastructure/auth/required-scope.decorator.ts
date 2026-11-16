import { SetMetadata } from '@nestjs/common';

export const REQUIRED_SCOPE_KEY = 'requiredScope';

/**
 * Declara o escopo que a rota exige de tokens de integração. Rotas sem este
 * decorator ficam **fechadas** para tokens `tfp_` (negado por padrão); a sessão
 * (JWT) não depende de escopo.
 */
export const RequiredScope = (scope: string) =>
  SetMetadata(REQUIRED_SCOPE_KEY, scope);
