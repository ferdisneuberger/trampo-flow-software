import 'reflect-metadata';
import {
  Controller,
  Delete,
  Get,
  Module,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OAuthSettings } from '../../src/application/oauth/services/oauth-settings';
import { AuthenticateOAuthAccessTokenUseCase } from '../../src/application/oauth/use-cases/authenticate-oauth-access-token.use-case';
import { DecideAuthorizationUseCase } from '../../src/application/oauth/use-cases/decide-authorization.use-case';
import { ExchangeAuthorizationCodeUseCase } from '../../src/application/oauth/use-cases/exchange-authorization-code.use-case';
import { GetAuthorizationServerMetadataUseCase } from '../../src/application/oauth/use-cases/get-authorization-server-metadata.use-case';
import { ListOAuthGrantsUseCase } from '../../src/application/oauth/use-cases/list-oauth-grants.use-case';
import { PreviewAuthorizationUseCase } from '../../src/application/oauth/use-cases/preview-authorization.use-case';
import { RefreshOAuthTokenUseCase } from '../../src/application/oauth/use-cases/refresh-oauth-token.use-case';
import { RegisterOAuthClientUseCase } from '../../src/application/oauth/use-cases/register-oauth-client.use-case';
import { RevokeOAuthGrantUseCase } from '../../src/application/oauth/use-cases/revoke-oauth-grant.use-case';
import { RevokeOAuthTokenUseCase } from '../../src/application/oauth/use-cases/revoke-oauth-token.use-case';
import { AuthenticatePersonalAccessTokenUseCase } from '../../src/application/auth/use-cases/authenticate-personal-access-token.use-case';
import {
  SCOPE_APPLICATIONS_READ,
  SCOPE_APPLICATIONS_WRITE,
} from '../../src/domain/auth/scopes';
import { UserRepository } from '../../src/domain/users/repositories/user.repository';
import { JwtAuthGuard } from '../../src/infrastructure/auth/jwt-auth.guard';
import { RateLimiterService } from '../../src/infrastructure/auth/rate-limiter.service';
import { RequiredScope } from '../../src/infrastructure/auth/required-scope.decorator';
import { SessionOnly } from '../../src/infrastructure/auth/session-only.decorator';
import { TokenService } from '../../src/infrastructure/auth/token.service';
import { DomainExceptionFilter } from '../../src/infrastructure/http/filters/domain-exception.filter';
import { OAuthConsentController } from '../../src/infrastructure/http/controllers/oauth-consent.controller';
import { OAuthController } from '../../src/infrastructure/http/controllers/oauth.controller';
import { OAuthMetadataController } from '../../src/infrastructure/http/controllers/oauth-metadata.controller';
import {
  authorizeParams,
  buildOAuthStack,
  CLAUDE_CALLBACK,
  pkcePair,
  RESOURCE,
  USER_ID,
  type OAuthStack,
} from '../helpers/oauth-fixture';

// Os testes não passam pelo `experimentalDecorators` do tsconfig (que só cobre
// `src/`), então os decorators da rota de sonda são aplicados à mão.
class ProbeController {
  read() {
    return { ok: true };
  }

  write() {
    return { ok: true };
  }

  closed() {
    return { ok: true };
  }

  sessionOnly() {
    return { ok: true };
  }
}

function decorate(
  method: keyof ProbeController,
  ...decorators: MethodDecorator[]
): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    ProbeController.prototype,
    method,
  ) as PropertyDescriptor;

  for (const decorator of decorators) {
    decorator(ProbeController.prototype, method, descriptor);
  }
}

Controller('probe')(ProbeController);
decorate('read', Get('read'), RequiredScope(SCOPE_APPLICATIONS_READ));
decorate('write', Post('write'), RequiredScope(SCOPE_APPLICATIONS_WRITE));
decorate('closed', Get('closed'));
decorate('sessionOnly', Delete('session-only'), SessionOnly());

async function bootstrap(stack: OAuthStack) {
  const providers = [
    ...[
      RegisterOAuthClientUseCase,
      PreviewAuthorizationUseCase,
      DecideAuthorizationUseCase,
      ExchangeAuthorizationCodeUseCase,
      RefreshOAuthTokenUseCase,
      RevokeOAuthTokenUseCase,
      ListOAuthGrantsUseCase,
      RevokeOAuthGrantUseCase,
      AuthenticateOAuthAccessTokenUseCase,
      GetAuthorizationServerMetadataUseCase,
    ].map((token) => ({
      provide: token,
      useValue: (stack as unknown as Record<string, unknown>)[
        {
          RegisterOAuthClientUseCase: 'register',
          PreviewAuthorizationUseCase: 'preview',
          DecideAuthorizationUseCase: 'decide',
          ExchangeAuthorizationCodeUseCase: 'exchange',
          RefreshOAuthTokenUseCase: 'refresh',
          RevokeOAuthTokenUseCase: 'revokeToken',
          ListOAuthGrantsUseCase: 'listGrants',
          RevokeOAuthGrantUseCase: 'revokeGrant',
          AuthenticateOAuthAccessTokenUseCase: 'authenticate',
          GetAuthorizationServerMetadataUseCase: 'metadata',
        }[token.name] as string
      ],
    })),
    { provide: OAuthSettings, useValue: stack.settings },
    { provide: RateLimiterService, useClass: RateLimiterService },
    TokenService,
    {
      provide: UserRepository,
      useValue: { existsById: async () => true },
    },
    {
      provide: AuthenticatePersonalAccessTokenUseCase,
      useValue: { execute: async () => Promise.reject(new Error('sem PAT')) },
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ];

  class TestModule {}

  Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({
            JWT_SECRET: 'x'.repeat(40),
            JWT_EXPIRES_IN: '5m',
          }),
        ],
      }),
    ],
    controllers: [
      OAuthMetadataController,
      OAuthController,
      OAuthConsentController,
      ProbeController,
    ],
    providers,
  })(TestModule);

  const app = await NestFactory.create<NestFastifyApplication>(
    TestModule,
    new FastifyAdapter(),
    { logger: false },
  );

  // Mesmo pipe e filtro globais do `main.ts`: o ValidationPipe estrito não
  // pode atrapalhar os endpoints OAuth.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const tokenService = app.get(TokenService);

  return {
    app,
    session: () => `Bearer ${tokenService.sign(USER_ID).token}`,
  };
}

type Booted = Awaited<ReturnType<typeof bootstrap>>;

function body<T = unknown>(response: { json: () => unknown }): T {
  return response.json() as T;
}

function form(values: Record<string, string>): string {
  return new URLSearchParams(values).toString();
}

describe('OAuth sobre HTTP: OAUTH_ENABLED=false', () => {
  let booted: Booted;

  beforeAll(async () => {
    booted = await bootstrap(buildOAuthStack({ enabled: false }));
  });
  afterAll(() => booted.app.close());

  it.each([
    ['GET', '/.well-known/oauth-authorization-server'],
    ['POST', '/oauth/register'],
    ['POST', '/oauth/token'],
    ['POST', '/oauth/revoke'],
    ['GET', '/oauth/authorize/preview'],
    ['POST', '/oauth/authorize/decision'],
    ['GET', '/oauth/grants'],
  ])('%s %s responde 404 (nenhuma rota nova exposta)', async (method, url) => {
    const response = await booted.app.inject({ method: method as 'GET', url });

    expect(response.statusCode).toBe(404);
  });

  it('o resto da API segue igual (rota fechada continua 401 sem token)', async () => {
    const response = await booted.app.inject({
      method: 'GET',
      url: '/probe/read',
    });

    expect(response.statusCode).toBe(401);
  });

  it('tfo_ não vale com a flag desligada', async () => {
    const response = await booted.app.inject({
      method: 'GET',
      url: '/probe/read',
      headers: { authorization: 'Bearer tfo_qualquercoisa' },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('OAuth sobre HTTP: OAUTH_ENABLED=true', () => {
  let booted: Booted;

  beforeAll(async () => {
    booted = await bootstrap(buildOAuthStack());
  });
  afterAll(() => booted.app.close());

  const inject = (
    method: 'GET' | 'POST' | 'DELETE',
    url: string,
    options: {
      headers?: Record<string, string>;
      payload?: string | object;
    } = {},
  ) => booted.app.inject({ method, url, ...options });

  async function registerAndAuthorize(scope?: string) {
    const registered = await inject('POST', '/oauth/register', {
      payload: {
        client_name: 'Claude',
        redirect_uris: [CLAUDE_CALLBACK],
        token_endpoint_auth_method: 'none',
      },
    });
    const clientId = body<{ client_id: string }>(registered).client_id;
    const { verifier, challenge } = pkcePair();
    const decision = await inject('POST', '/oauth/authorize/decision', {
      headers: { authorization: booted.session() },
      payload: {
        ...authorizeParams(clientId, challenge, scope ? { scope } : {}),
        approve: true,
      },
    });
    const url = new URL(body<{ redirectTo: string }>(decision).redirectTo);

    return { clientId, verifier, code: url.searchParams.get('code') as string };
  }

  it('metadata do servidor de autorização (RFC 8414)', async () => {
    const response = await inject(
      'GET',
      '/.well-known/oauth-authorization-server',
    );

    expect(response.statusCode).toBe(200);
    expect(body(response)).toMatchObject({
      issuer: 'https://trampo.example.com',
      code_challenge_methods_supported: ['S256'],
    });
  });

  it('DCR tolera campos desconhecidos (o ValidationPipe estrito não interfere) e não devolve segredo', async () => {
    const response = await inject('POST', '/oauth/register', {
      payload: {
        client_name: 'Inspector',
        redirect_uris: ['http://localhost:6274/oauth/callback'],
        token_endpoint_auth_method: 'none',
        campo_novo: [1, 2, 3],
        software_statement: 'x',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(body(response)).not.toHaveProperty('client_secret');
  });

  it('DCR recusa redirect fora da allowlist no formato RFC 7591', async () => {
    const response = await inject('POST', '/oauth/register', {
      payload: {
        client_name: 'Mau',
        redirect_uris: ['https://evil.example/cb'],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(body(response)).toMatchObject({
      error: 'invalid_redirect_uri',
      error_description: expect.any(String) as string,
    });
  });

  it('fluxo completo: decision (JWT) → /token (form) → chamada com tfo_ → refresh → revoke', async () => {
    const { clientId, verifier, code } = await registerAndAuthorize();
    const exchanged = await inject('POST', '/oauth/token', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: form({
        grant_type: 'authorization_code',
        code,
        redirect_uri: CLAUDE_CALLBACK,
        client_id: clientId,
        code_verifier: verifier,
        resource: RESOURCE,
        parametro_extra: 'tolerado',
      }),
    });

    expect(exchanged.statusCode).toBe(200);
    expect(exchanged.headers['cache-control']).toBe('no-store');
    const tokens = body<{
      access_token: string;
      refresh_token: string;
    }>(exchanged);
    const bearer = { authorization: `Bearer ${tokens.access_token}` };

    expect(
      (await inject('GET', '/probe/read', { headers: bearer })).statusCode,
    ).toBe(200);
    expect(
      (await inject('POST', '/probe/write', { headers: bearer })).statusCode,
    ).toBe(201);
    // deny-by-default e rotas só de sessão
    expect(
      (await inject('GET', '/probe/closed', { headers: bearer })).statusCode,
    ).toBe(403);
    expect(
      (await inject('DELETE', '/probe/session-only', { headers: bearer }))
        .statusCode,
    ).toBe(403);
    expect(
      (await inject('GET', '/oauth/grants', { headers: bearer })).statusCode,
    ).toBe(403);
    expect(
      (
        await inject('POST', '/oauth/authorize/decision', {
          headers: bearer,
          payload: { approve: true },
        })
      ).statusCode,
    ).toBe(403);

    const refreshed = await inject('POST', '/oauth/token', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: form({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: clientId,
      }),
    });

    expect(refreshed.statusCode).toBe(200);

    const next = body<{ refresh_token: string }>(refreshed);
    const revoked = await inject('POST', '/oauth/revoke', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: form({ token: next.refresh_token }),
    });

    expect(revoked.statusCode).toBe(200);
    expect(
      (await inject('GET', '/probe/read', { headers: bearer })).statusCode,
    ).toBe(401);
  });

  it('token com escopo só de leitura: leitura passa, escrita dá 403 insufficient_scope com resource_metadata', async () => {
    const { clientId, verifier, code } =
      await registerAndAuthorize('applications:read');
    const exchanged = await inject('POST', '/oauth/token', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: form({
        grant_type: 'authorization_code',
        code,
        redirect_uri: CLAUDE_CALLBACK,
        client_id: clientId,
        code_verifier: verifier,
      }),
    });
    const bearer = {
      authorization: `Bearer ${body<{ access_token: string }>(exchanged).access_token}`,
    };

    expect(
      (await inject('GET', '/probe/read', { headers: bearer })).statusCode,
    ).toBe(200);

    const denied = await inject('POST', '/probe/write', { headers: bearer });

    expect(denied.statusCode).toBe(403);
    expect(denied.headers['www-authenticate']).toContain(
      'error="insufficient_scope"',
    );
    expect(denied.headers['www-authenticate']).toContain(
      'resource_metadata="https://trampo.example.com/.well-known/oauth-protected-resource/mcp"',
    );
  });

  it('erros do /token no formato da RFC 6749, sem cache', async () => {
    const response = await inject('POST', '/oauth/token', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: form({
        grant_type: 'authorization_code',
        code: 'invalido',
        redirect_uri: CLAUDE_CALLBACK,
        client_id: 'tfc_x',
        code_verifier: 'a'.repeat(43),
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(body(response)).toEqual({
      error: 'invalid_grant',
      error_description: expect.any(String) as string,
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['pragma']).toBe('no-cache');
  });

  it.each([
    ['grant_type ausente', { client_id: 'tfc_x' }, 'invalid_request'],
    ['client_id ausente', { grant_type: 'refresh_token' }, 'invalid_request'],
    [
      'grant_type não suportado',
      { grant_type: 'password', client_id: 'tfc_x' },
      'unsupported_grant_type',
    ],
    [
      'refresh sem token',
      { grant_type: 'refresh_token', client_id: 'tfc_x' },
      'invalid_request',
    ],
  ])('/token: %s', async (_label, values, error) => {
    const response = await inject('POST', '/oauth/token', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: form(values),
    });

    expect(response.statusCode).toBe(400);
    expect(body(response)).toMatchObject({ error });
  });

  it('/token com parâmetro repetido é invalid_request (não vira array silencioso)', async () => {
    const response = await inject('POST', '/oauth/token', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload:
        'grant_type=refresh_token&client_id=a&client_id=b&refresh_token=tfr_x',
    });

    expect(response.statusCode).toBe(400);
    expect(body(response)).toMatchObject({ error: 'invalid_request' });
  });

  it('/revoke sempre 200, mesmo para token desconhecido; sem token é invalid_request', async () => {
    expect(
      (
        await inject('POST', '/oauth/revoke', {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          payload: form({ token: 'tfr_desconhecido' }),
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await inject('POST', '/oauth/revoke', {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          payload: '',
        })
      ).statusCode,
    ).toBe(400);
  });

  it('preview exige login (401 sem JWT) e devolve o erro do pedido inválido (400)', async () => {
    expect((await inject('GET', '/oauth/authorize/preview')).statusCode).toBe(
      401,
    );

    const response = await inject(
      'GET',
      '/oauth/authorize/preview?response_type=code&client_id=tfc_nao',
      { headers: { authorization: booted.session() } },
    );

    expect(response.statusCode).toBe(400);
    expect(body(response)).toMatchObject({
      error: expect.any(String) as string,
    });
  });

  it('decision exige approve booleano', async () => {
    const response = await inject('POST', '/oauth/authorize/decision', {
      headers: { authorization: booted.session() },
      payload: { approve: 'sim' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('GET /oauth/grants lista e DELETE revoga (só com sessão)', async () => {
    await registerAndAuthorize();

    const list = await inject('GET', '/oauth/grants', {
      headers: { authorization: booted.session() },
    });
    const grants = body<{ id: string; clientName: string }[]>(list);

    expect(list.statusCode).toBe(200);
    expect(grants.length).toBeGreaterThan(0);
    expect(
      (
        await inject('DELETE', `/oauth/grants/${grants[0].id}`, {
          headers: { authorization: booted.session() },
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (
        await inject('DELETE', `/oauth/grants/${grants[0].id}`, {
          headers: { authorization: booted.session() },
        })
      ).statusCode,
    ).toBe(404);
  });

  it('rate limit do registro: a 6ª tentativa do mesmo IP recebe 429 no formato RFC', async () => {
    const limited = await bootstrap(buildOAuthStack());
    const register = () =>
      limited.app.inject({
        method: 'POST',
        url: '/oauth/register',
        payload: { client_name: 'X', redirect_uris: [CLAUDE_CALLBACK] },
      });

    for (let i = 0; i < 5; i += 1) {
      expect((await register()).statusCode).toBe(201);
    }

    const blocked = await register();

    expect(blocked.statusCode).toBe(429);
    expect(body(blocked)).toMatchObject({ error: 'temporarily_unavailable' });
    expect(blocked.headers['retry-after']).toBeDefined();
    await limited.app.close();
  });
});
