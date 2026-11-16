import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthError } from '../../src/application/oauth/errors/oauth.error';
import { OAuthSettings } from '../../src/application/oauth/services/oauth-settings';
import { RegisterOAuthClientUseCase } from '../../src/application/oauth/use-cases/register-oauth-client.use-case';
import { CryptoOAuthTokenGenerator } from '../../src/infrastructure/oauth/crypto-oauth-token-generator';
import {
  authorize,
  authorizeParams,
  buildOAuthStack,
  CLAUDE_CALLBACK,
  ISSUER,
  OTHER_USER_ID,
  pkcePair,
  registerClient,
  RESOURCE,
  tokenInput,
  USER_ID,
  type OAuthStack,
} from '../helpers/oauth-fixture';

async function expectOAuthError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );

  expect(error).toBeInstanceOf(OAuthError);
  expect((error as OAuthError).code).toBe(code);
}

let stack: OAuthStack;
let clientId: string;

beforeEach(async () => {
  stack = buildOAuthStack();
  clientId = await registerClient(stack);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('registro dinâmico (DCR)', () => {
  it('registra cliente público sem client_secret e tolera campos extras', async () => {
    const response = await stack.register.execute({
      client_name: 'Claude',
      redirect_uris: [CLAUDE_CALLBACK],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      application_type: 'web',
      campo_desconhecido: { qualquer: 'coisa' },
      software_id: 'abc',
    });

    expect(response.client_id).toMatch(/^tfc_/);
    expect(response.token_endpoint_auth_method).toBe('none');
    expect(response).not.toHaveProperty('client_secret');
    expect(response.redirect_uris).toEqual([CLAUDE_CALLBACK]);
  });

  it.each([
    [
      'redirect fora da allowlist',
      { redirect_uris: ['https://evil.example/cb'] },
      'invalid_redirect_uri',
    ],
    [
      'redirect javascript:',
      { redirect_uris: ['javascript:alert(1)'] },
      'invalid_redirect_uri',
    ],
    ['sem redirect_uris', { redirect_uris: [] }, 'invalid_redirect_uri'],
    [
      'mais de 5 redirects',
      {
        redirect_uris: Array.from(
          { length: 6 },
          (_, i) => `http://localhost:${3000 + i}/cb`,
        ),
      },
      'invalid_redirect_uri',
    ],
    [
      'cliente confidencial',
      { token_endpoint_auth_method: 'client_secret_basic' },
      'invalid_client_metadata',
    ],
    [
      'grant implícito',
      { grant_types: ['implicit'] },
      'invalid_client_metadata',
    ],
    ['nome vazio', { client_name: '  ' }, 'invalid_client_metadata'],
    [
      'nome com mais de 120',
      { client_name: 'a'.repeat(121) },
      'invalid_client_metadata',
    ],
    [
      'nome com caractere de controle',
      { client_name: 'Claude\nAutorize' },
      'invalid_client_metadata',
    ],
    ['escopo desconhecido', { scope: 'admin' }, 'invalid_client_metadata'],
  ])('recusa %s', async (_label, patch, code) => {
    await expectOAuthError(
      stack.register.execute({
        client_name: 'App',
        redirect_uris: [CLAUDE_CALLBACK],
        ...patch,
      }),
      code,
    );
  });

  it('respeita o teto de clientes (OAUTH_MAX_CLIENTS)', async () => {
    const limited = new OAuthSettings(
      true,
      ISSUER,
      RESOURCE,
      [],
      3600_000,
      30 * 24 * 3600_000,
      60_000,
      1,
      10_000,
    );
    const useCase = new RegisterOAuthClientUseCase(
      stack.clients,
      new CryptoOAuthTokenGenerator(),
      limited,
    );

    // `beforeEach` já registrou um cliente DCR: o teto de 1 está cheio.
    await expectOAuthError(
      useCase.execute({
        client_name: 'B',
        redirect_uris: [CLAUDE_CALLBACK],
      }),
      'temporarily_unavailable',
    );
  });
});

describe('pedido de autorização (preview e decision)', () => {
  it('preview descreve o app, escopos e o que não pode (apagar)', async () => {
    const { challenge } = pkcePair();
    const preview = await stack.preview.execute(
      authorizeParams(clientId, challenge),
    );

    expect(preview.client).toEqual({
      name: 'Claude',
      verified: true,
      redirectHost: 'claude.ai',
    });
    expect(preview.scopes.map((scope) => scope.id)).toEqual([
      'applications:read',
      'applications:write',
    ]);
    expect(preview.cannotDo).toContain('apagar candidaturas');
  });

  it('cliente fora do Claude não é "verificado" e mostra o host de destino', async () => {
    const other = await registerClient(stack, [
      'http://localhost:4000/callback',
    ]);
    const { challenge } = pkcePair();
    const preview = await stack.preview.execute(
      authorizeParams(other, challenge, {
        redirect_uri: 'http://localhost:5555/callback',
      }),
    );

    expect(preview.client.verified).toBe(false);
    expect(preview.client.redirectHost).toBe('localhost:5555');
  });

  it.each([
    ['sem code_challenge', { code_challenge: undefined }, 'invalid_request'],
    ['PKCE plain', { code_challenge_method: 'plain' }, 'invalid_request'],
    [
      'sem método PKCE',
      { code_challenge_method: undefined },
      'invalid_request',
    ],
    ['challenge malformado', { code_challenge: 'curto' }, 'invalid_request'],
    ['response_type token', { response_type: 'token' }, 'invalid_request'],
    [
      'redirect não registrado',
      { redirect_uri: 'https://claude.ai/outro' },
      'invalid_request',
    ],
    [
      'redirect de loopback não registrado',
      { redirect_uri: 'http://localhost:1/callback' },
      'invalid_request',
    ],
    ['escopo desconhecido', { scope: 'applications:delete' }, 'invalid_scope'],
    [
      'resource de outro servidor',
      { resource: 'https://evil.example/mcp' },
      'invalid_target',
    ],
    ['resource com fragmento', { resource: `${RESOURCE}#x` }, 'invalid_target'],
    [
      'client_id desconhecido',
      { client_id: 'tfc_naoexiste' },
      'invalid_client',
    ],
    ['parâmetro repetido (array)', { state: ['a', 'b'] }, 'invalid_request'],
    ['state enorme', { state: 'a'.repeat(3000) }, 'invalid_request'],
  ])('recusa %s', async (_label, patch, code) => {
    const { challenge } = pkcePair();

    await expectOAuthError(
      stack.preview.execute({
        ...authorizeParams(clientId, challenge),
        ...patch,
      }),
      code,
    );
  });

  it('aceita resource com barra final e maiúsculas no host (canônico)', async () => {
    const { challenge } = pkcePair();

    await expect(
      stack.preview.execute(
        authorizeParams(clientId, challenge, {
          resource: 'https://TRAMPO.example.com/mcp/',
        }),
      ),
    ).resolves.toBeDefined();
  });

  it('resource ausente é tolerado (assume o padrão)', async () => {
    const { challenge } = pkcePair();

    await expect(
      stack.preview.execute(
        authorizeParams(clientId, challenge, { resource: undefined }),
      ),
    ).resolves.toBeDefined();
  });

  it('decision revalida tudo: PKCE plain é recusado mesmo sem passar pelo preview', async () => {
    const { challenge } = pkcePair();

    await expectOAuthError(
      stack.decide.execute({
        userId: USER_ID,
        params: authorizeParams(clientId, challenge, {
          code_challenge_method: 'plain',
        }),
        approve: true,
      }),
      'invalid_request',
    );
    expect(stack.codes.codes.size).toBe(0);
  });

  it('aprovar devolve redirect com code, state e iss; grava só o hash do código', async () => {
    const { code, url } = await authorize(stack, clientId);

    expect(url.origin + url.pathname).toBe(CLAUDE_CALLBACK);
    expect(url.searchParams.get('state')).toBe('xyz');
    expect(url.searchParams.get('iss')).toBe('https://trampo.example.com');
    expect(code.length).toBeGreaterThanOrEqual(43);
    expect(
      [...stack.codes.codes.values()].some(
        (record) => record.codeHash === code,
      ),
    ).toBe(false);
  });

  it('negar devolve access_denied, sem code e sem criar grant', async () => {
    const { challenge } = pkcePair();
    const { redirectTo } = await stack.decide.execute({
      userId: USER_ID,
      params: authorizeParams(clientId, challenge),
      approve: false,
    });
    const url = new URL(redirectTo);

    expect(url.searchParams.get('error')).toBe('access_denied');
    expect(url.searchParams.get('code')).toBeNull();
    expect(url.searchParams.get('state')).toBe('xyz');
    expect(stack.grants.grants.size).toBe(0);
  });

  it('reautorizar reaproveita o grant ativo (um por pessoa e app)', async () => {
    await authorize(stack, clientId);
    await authorize(stack, clientId, {
      extra: { scope: 'applications:read' },
    });

    const grants = [...stack.grants.grants.values()];

    expect(grants).toHaveLength(1);
    expect(grants[0]?.scope).toBe('applications:read');
  });

  it('o state é repassado codificado (não injeta parâmetros)', async () => {
    const { url } = await authorize(stack, clientId, {
      extra: { state: 'a&code=falso#x' },
    });

    expect(url.searchParams.get('state')).toBe('a&code=falso#x');
    expect(url.searchParams.getAll('code')).toHaveLength(1);
  });
});

describe('troca do código (/token)', () => {
  it('troca por access e refresh; só guarda HMAC dos tokens', async () => {
    const { code, verifier } = await authorize(stack, clientId);
    const response = await stack.exchange.execute(
      tokenInput(clientId, code, verifier),
    );

    expect(response.access_token).toMatch(/^tfo_/);
    expect(response.refresh_token).toMatch(/^tfr_/);
    expect(response.token_type).toBe('Bearer');
    expect(response.expires_in).toBe(3600);
    expect(response.scope).toBe('applications:read applications:write');

    const stored = JSON.stringify([
      ...stack.tokens.accessTokens.values(),
      ...stack.tokens.refreshTokens.values(),
    ]);

    expect(stored).not.toContain(response.access_token);
    expect(stored).not.toContain(response.refresh_token);
  });

  it('PKCE: verifier errado é invalid_grant e não emite tokens', async () => {
    const { code } = await authorize(stack, clientId);

    await expectOAuthError(
      stack.exchange.execute(tokenInput(clientId, code, pkcePair().verifier)),
      'invalid_grant',
    );
    expect(stack.tokens.accessTokens.size).toBe(0);
  });

  it('PKCE: verifier ausente ou fora do formato é invalid_request', async () => {
    const { code } = await authorize(stack, clientId);

    await expectOAuthError(
      stack.exchange.execute(tokenInput(clientId, code, 'curto')),
      'invalid_request',
    );
  });

  it('código de uso único: o segundo uso falha e REVOGA o grant (access e refresh caem)', async () => {
    const { code, verifier } = await authorize(stack, clientId);
    const first = await stack.exchange.execute(
      tokenInput(clientId, code, verifier),
    );

    await expectOAuthError(
      stack.exchange.execute(tokenInput(clientId, code, verifier)),
      'invalid_grant',
    );

    await expect(
      stack.authenticate.execute(first.access_token),
    ).rejects.toThrow();
    await expectOAuthError(
      stack.refresh.execute({ refreshToken: first.refresh_token, clientId }),
      'invalid_grant',
    );
  });

  it('corrida: dois /token simultâneos com o mesmo código, só um vence', async () => {
    const { code, verifier } = await authorize(stack, clientId);
    const results = await Promise.allSettled([
      stack.exchange.execute(tokenInput(clientId, code, verifier)),
      stack.exchange.execute(tokenInput(clientId, code, verifier)),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });

  it('código expirado (60 s) é invalid_grant', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { code, verifier } = await authorize(stack, clientId);

    vi.setSystemTime(Date.now() + 61_000);

    await expectOAuthError(
      stack.exchange.execute(tokenInput(clientId, code, verifier)),
      'invalid_grant',
    );
  });

  it('código de outro cliente é invalid_grant', async () => {
    const other = await registerClient(stack);
    const { code, verifier } = await authorize(stack, clientId);

    await expectOAuthError(
      stack.exchange.execute(tokenInput(other, code, verifier)),
      'invalid_grant',
    );
  });

  it('redirect_uri diferente do pedido de autorização é invalid_grant', async () => {
    const { code, verifier } = await authorize(stack, clientId);

    await expectOAuthError(
      stack.exchange.execute(
        tokenInput(clientId, code, verifier, {
          redirectUri: 'https://claude.com/api/mcp/auth_callback',
        }),
      ),
      'invalid_grant',
    );
  });

  it('código inexistente é invalid_grant', async () => {
    await expectOAuthError(
      stack.exchange.execute(
        tokenInput(clientId, 'codigo-que-nao-existe', pkcePair().verifier),
      ),
      'invalid_grant',
    );
  });

  it('resource de outro servidor é invalid_target', async () => {
    const { code, verifier } = await authorize(stack, clientId);

    await expectOAuthError(
      stack.exchange.execute(
        tokenInput(clientId, code, verifier, {
          resource: 'https://evil.example/mcp',
        }),
      ),
      'invalid_target',
    );
  });

  it('grant revogado entre o authorize e o token: invalid_grant', async () => {
    const { code, verifier } = await authorize(stack, clientId);
    const [grant] = [...stack.grants.grants.values()];

    await stack.grants.revoke(grant.id, new Date());

    await expectOAuthError(
      stack.exchange.execute(tokenInput(clientId, code, verifier)),
      'invalid_grant',
    );
  });
});

describe('refresh rotativo', () => {
  async function connect() {
    const { code, verifier } = await authorize(stack, clientId);

    return stack.exchange.execute(tokenInput(clientId, code, verifier));
  }

  it('rotaciona: devolve novo par e o refresh antigo deixa de valer (fora da janela)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const first = await connect();
    const second = await stack.refresh.execute({
      refreshToken: first.refresh_token,
      clientId,
    });

    expect(second.refresh_token).not.toBe(first.refresh_token);
    expect(second.access_token).not.toBe(first.access_token);

    vi.setSystemTime(Date.now() + 11_000);

    await expectOAuthError(
      stack.refresh.execute({ refreshToken: first.refresh_token, clientId }),
      'invalid_grant',
    );
  });

  it('reuso fora da janela revoga a FAMÍLIA: o refresh novo também cai', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const first = await connect();
    const second = await stack.refresh.execute({
      refreshToken: first.refresh_token,
      clientId,
    });

    vi.setSystemTime(Date.now() + 11_000);

    await expectOAuthError(
      stack.refresh.execute({ refreshToken: first.refresh_token, clientId }),
      'invalid_grant',
    );
    await expectOAuthError(
      stack.refresh.execute({ refreshToken: second.refresh_token, clientId }),
      'invalid_grant',
    );
  });

  it('janela de graça de 10 s tolera retry concorrente do refresh antigo', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const first = await connect();

    await stack.refresh.execute({
      refreshToken: first.refresh_token,
      clientId,
    });
    vi.setSystemTime(Date.now() + 5_000);

    await expect(
      stack.refresh.execute({ refreshToken: first.refresh_token, clientId }),
    ).resolves.toMatchObject({ token_type: 'Bearer' });
  });

  it('nunca amplia o escopo', async () => {
    const { code, verifier } = await authorize(stack, clientId, {
      extra: { scope: 'applications:read' },
    });
    const first = await stack.exchange.execute(
      tokenInput(clientId, code, verifier),
    );

    await expectOAuthError(
      stack.refresh.execute({
        refreshToken: first.refresh_token,
        clientId,
        scope: 'applications:read applications:write',
      }),
      'invalid_scope',
    );
  });

  it('permite reduzir o escopo, e o access token novo carrega só o reduzido', async () => {
    const first = await connect();
    const next = await stack.refresh.execute({
      refreshToken: first.refresh_token,
      clientId,
      scope: 'applications:read',
    });
    const auth = await stack.authenticate.execute(next.access_token);

    expect(next.scope).toBe('applications:read');
    expect(auth.scopes).toEqual(['applications:read']);
  });

  it('refresh de outro cliente é invalid_grant (e não revoga nada)', async () => {
    const first = await connect();
    const other = await registerClient(stack);

    await expectOAuthError(
      stack.refresh.execute({
        refreshToken: first.refresh_token,
        clientId: other,
      }),
      'invalid_grant',
    );
    await expect(
      stack.refresh.execute({ refreshToken: first.refresh_token, clientId }),
    ).resolves.toBeDefined();
  });

  it('refresh expirado (30 dias) é invalid_grant', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const first = await connect();

    vi.setSystemTime(Date.now() + 31 * 24 * 3600_000);

    await expectOAuthError(
      stack.refresh.execute({ refreshToken: first.refresh_token, clientId }),
      'invalid_grant',
    );
  });

  it('qualquer falha devolve invalid_grant com a mesma mensagem', async () => {
    const unknown = await stack.refresh
      .execute({ refreshToken: 'tfr_inexistente', clientId })
      .catch((error: OAuthError) => error);
    const first = await connect();
    const other = await registerClient(stack);
    const wrongClient = await stack.refresh
      .execute({ refreshToken: first.refresh_token, clientId: other })
      .catch((error: OAuthError) => error);

    expect((unknown as OAuthError).message).toBe(
      (wrongClient as OAuthError).message,
    );
  });
});

describe('access token, revogação e grants', () => {
  async function connect() {
    const { code, verifier } = await authorize(stack, clientId);

    return stack.exchange.execute(tokenInput(clientId, code, verifier));
  }

  it('autentica o access token com usuário, grant e escopos (sem offline_access)', async () => {
    const { code, verifier } = await authorize(stack, clientId, {
      extra: { scope: 'applications:read offline_access' },
    });
    const tokens = await stack.exchange.execute(
      tokenInput(clientId, code, verifier),
    );
    const auth = await stack.authenticate.execute(tokens.access_token);

    expect(auth.userId).toBe(USER_ID);
    expect(auth.scopes).toEqual(['applications:read']);
  });

  it('access token expirado (1 h) é recusado', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const tokens = await connect();

    vi.setSystemTime(Date.now() + 3601_000);

    await expect(
      stack.authenticate.execute(tokens.access_token),
    ).rejects.toThrow();
  });

  it('audiência: grant com outro resource não autentica (invalid)', async () => {
    const tokens = await connect();
    const [grant] = [...stack.grants.grants.values()];

    stack.grants.grants.set(grant.id, {
      ...grant,
      resource: 'https://outro.example.com/mcp',
    });

    await expect(
      stack.authenticate.execute(tokens.access_token),
    ).rejects.toThrow();
  });

  it('usuário apagado: o token deixa de valer', async () => {
    const tokens = await connect();

    stack.users.existing.delete(USER_ID);

    await expect(
      stack.authenticate.execute(tokens.access_token),
    ).rejects.toThrow();
  });

  it('token com prefixo certo mas desconhecido é recusado', async () => {
    await expect(
      stack.authenticate.execute('tfo_nao-existe'),
    ).rejects.toThrow();
  });

  it('revogar o grant derruba access e refresh na hora', async () => {
    const tokens = await connect();
    const [grant] = await stack.listGrants.execute(USER_ID);

    await stack.revokeGrant.execute({ userId: USER_ID, grantId: grant.id });

    await expect(
      stack.authenticate.execute(tokens.access_token),
    ).rejects.toThrow();
    await expectOAuthError(
      stack.refresh.execute({ refreshToken: tokens.refresh_token, clientId }),
      'invalid_grant',
    );
    await expect(stack.listGrants.execute(USER_ID)).resolves.toEqual([]);
  });

  it('ninguém revoga o grant de outra pessoa', async () => {
    await connect();
    const [grant] = await stack.listGrants.execute(USER_ID);

    await expect(
      stack.revokeGrant.execute({ userId: OTHER_USER_ID, grantId: grant.id }),
    ).rejects.toMatchObject({ code: 'OAUTH_GRANT_NOT_FOUND' });
    await expect(stack.listGrants.execute(USER_ID)).resolves.toHaveLength(1);
    await expect(stack.listGrants.execute(OTHER_USER_ID)).resolves.toEqual([]);
  });

  it('lista os aplicativos conectados com nome, escopos e último uso', async () => {
    await connect();

    const [grant] = await stack.listGrants.execute(USER_ID);

    expect(grant).toMatchObject({
      clientName: 'Claude',
      scopes: ['applications:read', 'applications:write'],
    });
  });

  it('/revoke com refresh revoga o grant inteiro; com access derruba só ele; token desconhecido é silencioso', async () => {
    const tokens = await connect();

    await stack.revokeToken.execute('tfo_desconhecido');
    await stack.revokeToken.execute('qualquer-coisa');
    await expect(
      stack.authenticate.execute(tokens.access_token),
    ).resolves.toBeDefined();

    await stack.revokeToken.execute(tokens.access_token);
    await expect(
      stack.authenticate.execute(tokens.access_token),
    ).rejects.toThrow();
    await expect(
      stack.refresh.execute({ refreshToken: tokens.refresh_token, clientId }),
    ).resolves.toBeDefined();

    const again = await stack.refresh.execute({
      refreshToken: tokens.refresh_token,
      clientId,
    });

    await stack.revokeToken.execute(again.refresh_token);
    await expect(
      stack.authenticate.execute(again.access_token),
    ).rejects.toThrow();
    await expect(stack.listGrants.execute(USER_ID)).resolves.toEqual([]);
  });
});

describe('metadata do servidor de autorização', () => {
  it('anuncia só o que existe e o issuer sem caminho', () => {
    const metadata = stack.metadata.execute();

    expect(metadata).toMatchObject({
      issuer: 'https://trampo.example.com',
      authorization_endpoint: 'https://trampo.example.com/oauth/authorize',
      token_endpoint: 'https://trampo.example.com/api/oauth/token',
      registration_endpoint: 'https://trampo.example.com/api/oauth/register',
      revocation_endpoint: 'https://trampo.example.com/api/oauth/revoke',
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      client_id_metadata_document_supported: true,
      authorization_response_iss_parameter_supported: true,
    });
    expect(metadata.scopes_supported).toEqual([
      'applications:read',
      'applications:write',
      'offline_access',
    ]);
  });
});
