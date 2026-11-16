import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import {
  SCOPE_APPLICATIONS_READ,
  SCOPE_APPLICATIONS_WRITE,
} from '../../src/domain/auth/scopes';
import { REQUIRED_SCOPE_KEY } from '../../src/infrastructure/auth/required-scope.decorator';
import { IS_SESSION_ONLY_KEY } from '../../src/infrastructure/auth/session-only.decorator';
import { AdminUsersController } from '../../src/infrastructure/http/controllers/admin-users.controller';
import { ApplicationsController } from '../../src/infrastructure/http/controllers/applications.controller';
import { AuthController } from '../../src/infrastructure/http/controllers/auth.controller';
import { IS_OAUTH_ROUTE_KEY } from '../../src/infrastructure/auth/oauth-route.decorator';
import { IS_PUBLIC_KEY } from '../../src/infrastructure/auth/public.decorator';
import { OAuthConsentController } from '../../src/infrastructure/http/controllers/oauth-consent.controller';
import { OAuthController } from '../../src/infrastructure/http/controllers/oauth.controller';
import { OAuthMetadataController } from '../../src/infrastructure/http/controllers/oauth-metadata.controller';
import { PersonalAccessTokensController } from '../../src/infrastructure/http/controllers/personal-access-tokens.controller';

type ControllerClass = { prototype: object; name: string };

function handlers(controller: ControllerClass): string[] {
  return Object.getOwnPropertyNames(controller.prototype).filter((name) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      controller.prototype,
      name,
    );

    return name !== 'constructor' && typeof descriptor?.value === 'function';
  });
}

function metadata(controller: ControllerClass, handler: string, key: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    controller.prototype,
    handler,
  );

  return Reflect.getMetadata(key, descriptor?.value as object) as unknown;
}

/**
 * Tokens de integração (tfp_) são negados por padrão: só alcançam rotas com
 * @RequiredScope. Este teste trava a lista, para que uma rota nova não fique
 * aberta ao token por esquecimento.
 */
describe('escopos exigidos por rota (token de integração)', () => {
  it('candidaturas: leitura e escrita declaradas; exclusão só com sessão', () => {
    const expected: Record<string, string | undefined> = {
      create: SCOPE_APPLICATIONS_WRITE,
      preview: SCOPE_APPLICATIONS_READ,
      list: SCOPE_APPLICATIONS_READ,
      board: SCOPE_APPLICATIONS_READ,
      stats: SCOPE_APPLICATIONS_READ,
      findOne: SCOPE_APPLICATIONS_READ,
      update: SCOPE_APPLICATIONS_WRITE,
      place: SCOPE_APPLICATIONS_WRITE,
      remove: undefined,
    };

    expect(handlers(ApplicationsController).sort()).toEqual(
      Object.keys(expected).sort(),
    );

    for (const [handler, scope] of Object.entries(expected)) {
      expect(
        metadata(ApplicationsController, handler, REQUIRED_SCOPE_KEY),
        handler,
      ).toBe(scope);
    }

    expect(
      metadata(ApplicationsController, 'remove', IS_SESSION_ONLY_KEY),
    ).toBe(true);
  });

  it('auth: só whoami é aberto ao token; perfil, tema e reenvio ficam fechados', () => {
    const open = handlers(AuthController).filter((handler) =>
      metadata(AuthController, handler, REQUIRED_SCOPE_KEY),
    );

    expect(open).toEqual(['whoami']);
    expect(metadata(AuthController, 'whoami', REQUIRED_SCOPE_KEY)).toBe(
      SCOPE_APPLICATIONS_READ,
    );
  });

  it('tokens de integração e administração não declaram escopo', () => {
    for (const controller of [PersonalAccessTokensController]) {
      for (const handler of handlers(controller)) {
        expect(metadata(controller, handler, REQUIRED_SCOPE_KEY)).toBe(
          undefined,
        );
      }
    }

    expect(
      Reflect.getMetadata(IS_SESSION_ONLY_KEY, PersonalAccessTokensController),
    ).toBe(true);
    expect(
      handlers(AdminUsersController).filter((handler) =>
        metadata(AdminUsersController, handler, REQUIRED_SCOPE_KEY),
      ),
    ).toEqual([]);
  });

  it('OAuth: consentimento e grants só com sessão; endpoints públicos sem escopo; tudo atrás da flag', () => {
    for (const controller of [
      OAuthConsentController,
      OAuthController,
      OAuthMetadataController,
    ]) {
      expect(Reflect.getMetadata(IS_OAUTH_ROUTE_KEY, controller)).toBe(true);

      // Nenhuma rota OAuth é alcançável por tfp_/tfo_ via escopo.
      for (const handler of handlers(controller)) {
        expect(metadata(controller, handler, REQUIRED_SCOPE_KEY)).toBe(
          undefined,
        );
      }
    }

    expect(
      Reflect.getMetadata(IS_SESSION_ONLY_KEY, OAuthConsentController),
    ).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, OAuthConsentController)).toBe(
      undefined,
    );
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, OAuthController)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, OAuthMetadataController)).toBe(
      true,
    );
    expect(handlers(OAuthController).sort()).toEqual([
      'register',
      'revoke',
      'token',
    ]);
  });
});
