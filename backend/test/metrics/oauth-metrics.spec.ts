import { HttpException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OAuthError } from '../../src/application/oauth/errors/oauth.error';
import { OAuthConsentController } from '../../src/infrastructure/http/controllers/oauth-consent.controller';
import { OAuthController } from '../../src/infrastructure/http/controllers/oauth.controller';
import { OAuthCleanupService } from '../../src/infrastructure/oauth/oauth-cleanup.service';
import {
  authorize,
  authorizeParams,
  buildOAuthStack,
  CLAUDE_CALLBACK,
  CLAUDE_CODE_CLIENT,
  pkcePair,
  registerClient,
  tokenInput,
  USER_ID,
} from '../helpers/oauth-fixture';
import { SpyAppMetrics } from '../helpers/spy-app-metrics';

afterEach(() => vi.useRealTimers());

async function connected() {
  const stack = buildOAuthStack();
  const clientId = await registerClient(stack);
  const { code, verifier } = await authorize(stack, clientId);
  const tokens = await stack.exchange.execute(
    tokenInput(clientId, code, verifier),
  );

  stack.metrics.calls.length = 0;

  return { stack, clientId, code, verifier, tokens };
}

describe('métricas do OAuth: sinais de roubo', () => {
  it('código de autorização reutilizado', async () => {
    const { stack, clientId, code, verifier } = await connected();

    await expect(
      stack.exchange.execute(tokenInput(clientId, code, verifier)),
    ).rejects.toBeInstanceOf(OAuthError);

    expect(stack.metrics.of('oauthCodeReuse')).toEqual([[]]);
  });

  it('dois /token simultâneos com o mesmo código contam o reuso do perdedor', async () => {
    const stack = buildOAuthStack();
    const clientId = await registerClient(stack);
    const { code, verifier } = await authorize(stack, clientId);

    stack.metrics.calls.length = 0;
    await Promise.allSettled([
      stack.exchange.execute(tokenInput(clientId, code, verifier)),
      stack.exchange.execute(tokenInput(clientId, code, verifier)),
    ]);

    expect(stack.metrics.of('oauthCodeReuse')).toHaveLength(1);
  });

  it('refresh reutilizado fora da janela conta; dentro da janela de graça, não', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });

    const { stack, clientId, tokens } = await connected();

    await stack.refresh.execute({
      refreshToken: tokens.refresh_token,
      clientId,
    });
    vi.setSystemTime(Date.now() + 5_000);
    await stack.refresh.execute({
      refreshToken: tokens.refresh_token,
      clientId,
    });
    expect(stack.metrics.of('oauthRefreshReuse')).toEqual([]);

    vi.setSystemTime(Date.now() + 20_000);
    await expect(
      stack.refresh.execute({ refreshToken: tokens.refresh_token, clientId }),
    ).rejects.toBeInstanceOf(OAuthError);
    expect(stack.metrics.of('oauthRefreshReuse')).toEqual([[]]);
  });
});

describe('métricas do OAuth: revogação e autenticação', () => {
  it('revogar refresh derruba o grant; revogar access derruba só o token; desconhecido não conta', async () => {
    const { stack, tokens } = await connected();

    await stack.revokeToken.execute('tfo_desconhecido');
    await stack.revokeToken.execute('qualquer');
    expect(stack.metrics.of('oauthRevocation')).toEqual([]);

    await stack.revokeToken.execute(tokens.access_token);
    await stack.revokeToken.execute(tokens.refresh_token);

    expect(stack.metrics.of('oauthRevocation')).toEqual([['token'], ['grant']]);
  });

  it('revogar o grant pela tela de aplicativos conectados', async () => {
    const { stack } = await connected();
    const [grant] = await stack.listGrants.execute(USER_ID);

    await stack.revokeGrant.execute({ userId: USER_ID, grantId: grant.id });

    expect(stack.metrics.of('oauthRevocation')).toEqual([['grant']]);
  });

  it('resultado da autenticação do access token: ok, desconhecido, expirado, revogado e audiência', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });

    const { stack, tokens } = await connected();

    await stack.authenticate.execute(tokens.access_token);
    await expect(
      stack.authenticate.execute('tfo_nao-existe'),
    ).rejects.toBeDefined();

    const [grant] = [...stack.grants.grants.values()];

    stack.grants.grants.set(grant.id, {
      ...grant,
      resource: 'https://outro.example/mcp',
    });
    await expect(
      stack.authenticate.execute(tokens.access_token),
    ).rejects.toBeDefined();
    stack.grants.grants.set(grant.id, { ...grant, revokedAt: new Date() });
    await expect(
      stack.authenticate.execute(tokens.access_token),
    ).rejects.toBeDefined();
    stack.grants.grants.set(grant.id, { ...grant });

    vi.setSystemTime(Date.now() + 3601_000);
    await expect(
      stack.authenticate.execute(tokens.access_token),
    ).rejects.toBeDefined();

    expect(stack.metrics.of('oauthAccessTokenAuth')).toEqual([
      ['ok'],
      ['unknown'],
      ['audience_mismatch'],
      ['revoked'],
      ['expired'],
    ]);
  });
});

describe('métricas do OAuth: autorização e CIMD', () => {
  it('decisão: aprovada (Claude, DCR), negada e aprovada por cliente que não é o Claude', async () => {
    const stack = buildOAuthStack();
    const claude = await registerClient(stack);
    const other = await registerClient(stack, [
      'http://localhost:4000/callback',
    ]);
    const { challenge } = pkcePair();

    await stack.decide.execute({
      userId: USER_ID,
      params: authorizeParams(claude, challenge),
      approve: true,
    });
    await stack.decide.execute({
      userId: USER_ID,
      params: authorizeParams(claude, challenge),
      approve: false,
    });
    await stack.decide.execute({
      userId: USER_ID,
      params: authorizeParams(other, challenge, {
        redirect_uri: 'http://localhost:4000/callback',
      }),
      approve: true,
    });

    expect(stack.metrics.of('oauthAuthorization')).toEqual([
      ['approved', 'claude', 'dcr'],
      ['denied', 'claude', 'dcr'],
      ['approved', 'other', 'dcr'],
    ]);
  });

  it('CIMD: falha de busca, documento inválido, sucesso (cache miss) e acerto de cache', async () => {
    const stack = buildOAuthStack();
    const url = 'https://app.example.org/client.json';

    stack.fetcher.documents.set(url, { ok: false, reason: 'blocked' });
    await expect(stack.resolveClient.execute(url)).rejects.toBeInstanceOf(
      OAuthError,
    );

    stack.fetcher.documents.set(url, {
      ok: true,
      document: { client_id: 'https://outro/x' },
      maxAgeSeconds: null,
    });
    await expect(stack.resolveClient.execute(url)).rejects.toBeInstanceOf(
      OAuthError,
    );

    stack.fetcher.documents.set(url, {
      ok: true,
      maxAgeSeconds: null,
      document: {
        client_id: url,
        client_name: 'App',
        redirect_uris: ['http://localhost:7777/callback'],
      },
    });
    await stack.resolveClient.execute(url);
    await stack.resolveClient.execute(url);

    expect(
      stack.metrics.of('oauthCimdFetch').map(([result]) => result),
    ).toEqual(['blocked', 'invalid', 'ok']);
    expect(
      stack.metrics
        .of('oauthCimdFetch')
        .every(([, seconds]) => typeof seconds === 'number'),
    ).toBe(true);
    expect(
      stack.metrics.of('oauthCimdCache').map(([result]) => result),
    ).toEqual(['miss', 'miss', 'miss', 'hit']);
  });

  it('uma URL de client_id inválida não conta como busca (nada foi buscado)', async () => {
    const stack = buildOAuthStack();

    await expect(
      stack.resolveClient.execute('https://app.example.org'),
    ).rejects.toBeDefined();

    expect(stack.metrics.of('oauthCimdFetch')).toEqual([]);
    // O documento do próprio Claude Code é um CIMD válido de verdade.
    stack.fetcher.documents.set(CLAUDE_CODE_CLIENT, {
      ok: true,
      maxAgeSeconds: null,
      document: {
        client_id: CLAUDE_CODE_CLIENT,
        client_name: 'Claude Code',
        redirect_uris: ['http://localhost/callback'],
      },
    });
    await stack.resolveClient.execute(CLAUDE_CODE_CLIENT);
    expect(stack.metrics.of('oauthCimdFetch')).toEqual([
      ['ok', expect.any(Number) as number],
    ]);
  });
});

function controllers(
  metrics: SpyAppMetrics,
  overrides: Record<string, unknown> = {},
) {
  const fns = {
    register: vi.fn(),
    exchange: vi.fn(),
    refresh: vi.fn(),
    revoke: vi.fn(),
    consume: vi.fn(),
    ...overrides,
  };
  const controller = new OAuthController(
    { execute: fns.register } as never,
    { execute: fns.exchange } as never,
    { execute: fns.refresh } as never,
    { execute: fns.revoke } as never,
    { consume: fns.consume } as never,
    metrics,
  );

  return { controller, ...fns };
}

const request = { ip: '203.0.113.9' } as never;

describe('métricas do OAuth: endpoints públicos', () => {
  it('registro: criado e cada erro mapeado para a lista fechada', async () => {
    const metrics = new SpyAppMetrics();
    const { controller, register } = controllers(metrics);

    register.mockResolvedValueOnce({ client_id: 'tfc_x' });
    await controller.register({}, request);

    for (const error of [
      new OAuthError('invalid_redirect_uri', 'x'),
      new OAuthError('invalid_client_metadata', 'x'),
      new OAuthError('temporarily_unavailable', 'x', 503),
      new OAuthError('invalid_request', 'x'),
      new Error('banco caiu'),
    ]) {
      register.mockRejectedValueOnce(error);
      await expect(controller.register({}, request)).rejects.toBe(error);
    }

    expect(metrics.of('oauthClientRegistered')).toEqual([
      ['created'],
      ['invalid_redirect_uri'],
      ['invalid_client_metadata'],
      ['limit'],
      ['error'],
      ['error'],
    ]);
  });

  it('token: sucesso por tipo de concessão e cada erro RFC 6749', async () => {
    const metrics = new SpyAppMetrics();
    const { controller, exchange, refresh } = controllers(metrics);
    const base = { client_id: 'tfc_x' };

    exchange.mockResolvedValueOnce({});
    await controller.token(
      {
        ...base,
        grant_type: 'authorization_code',
        code: 'c',
        redirect_uri: CLAUDE_CALLBACK,
        code_verifier: 'v',
      },
      request,
    );
    refresh.mockResolvedValueOnce({});
    await controller.token(
      { ...base, grant_type: 'refresh_token', refresh_token: 'r' },
      request,
    );

    refresh.mockRejectedValueOnce(new OAuthError('invalid_grant', 'x'));
    await expect(
      controller.token(
        { ...base, grant_type: 'refresh_token', refresh_token: 'r' },
        request,
      ),
    ).rejects.toBeDefined();
    await expect(
      controller.token({ ...base, grant_type: 'password' }, request),
    ).rejects.toBeDefined();
    await expect(controller.token({}, request)).rejects.toBeDefined();

    expect(metrics.of('oauthTokenRequest')).toEqual([
      ['authorization_code', 'ok'],
      ['refresh_token', 'ok'],
      ['refresh_token', 'invalid_grant'],
      ['other', 'unsupported_grant_type'],
      ['other', 'invalid_request'],
    ]);
  });

  it('token: o limitador (429) vira rate_limited e um erro inesperado vira error', async () => {
    const metrics = new SpyAppMetrics();
    const limited = controllers(metrics, {
      consume: vi.fn(() => {
        throw new HttpException('muitas', 429);
      }),
    });

    await expect(
      limited.controller.token(
        { client_id: 'x', grant_type: 'refresh_token' },
        request,
      ),
    ).rejects.toBeInstanceOf(HttpException);

    const broken = controllers(metrics);

    broken.exchange.mockRejectedValueOnce(new Error('banco caiu'));
    await expect(
      broken.controller.token(
        {
          client_id: 'x',
          grant_type: 'authorization_code',
          code: 'c',
          redirect_uri: 'r',
          code_verifier: 'v',
        },
        request,
      ),
    ).rejects.toThrow('banco caiu');

    expect(metrics.of('oauthTokenRequest')).toEqual([
      ['refresh_token', 'rate_limited'],
      ['authorization_code', 'error'],
    ]);
  });

  it('decisão inválida conta como erro, com a origem pela forma do client_id', async () => {
    const metrics = new SpyAppMetrics();
    const decide = vi
      .fn()
      .mockRejectedValue(new OAuthError('invalid_request', 'x'));
    const controller = new OAuthConsentController(
      {} as never,
      { execute: decide } as never,
      {} as never,
      {} as never,
      { consume: vi.fn() } as never,
      metrics,
    );

    await expect(
      controller.decision(
        { approve: true, client_id: 'https://app.example.org/c.json' },
        USER_ID,
      ),
    ).rejects.toBeInstanceOf(OAuthError);
    await expect(
      controller.decision({ approve: true, client_id: 'tfc_abc' }, USER_ID),
    ).rejects.toBeInstanceOf(OAuthError);

    expect(metrics.of('oauthAuthorization')).toEqual([
      ['error', 'other', 'cimd'],
      ['error', 'other', 'dcr'],
    ]);
  });
});

describe('métricas da limpeza do OAuth', () => {
  it('soma o que foi apagado por tabela e marca o sucesso', async () => {
    const metrics = new SpyAppMetrics();
    const service = new OAuthCleanupService(
      { enabled: true } as never,
      { deleteExpiredBefore: async () => 3 } as never,
      {
        deleteExpiredAccessTokens: async () => 2,
        deleteStaleRefreshTokens: async () => 1,
      } as never,
      { deleteUnusedDcr: async () => 0 } as never,
      metrics,
    );

    await service.runOnce();

    expect(metrics.of('oauthCleanup')).toEqual([
      [{ codes: 3, access_tokens: 2, refresh_tokens: 1, clients: 0 }],
    ]);
    expect(metrics.of('oauthCleanupFailed')).toEqual([]);
  });

  it('falha da limpeza é contada e não lança', async () => {
    const metrics = new SpyAppMetrics();
    const service = new OAuthCleanupService(
      { enabled: true } as never,
      {
        deleteExpiredBefore: async () =>
          Promise.reject(new Error('banco fora')),
      } as never,
      {} as never,
      {} as never,
      metrics,
    );

    await expect(service.runOnce()).resolves.toBeUndefined();

    expect(metrics.of('oauthCleanupFailed')).toEqual([[]]);
    expect(metrics.of('oauthCleanup')).toEqual([]);
  });

  it('ao agendar, o instante do último sucesso parte do início do processo', () => {
    const metrics = new SpyAppMetrics();
    const service = new OAuthCleanupService(
      { enabled: true } as never,
      {} as never,
      {} as never,
      {} as never,
      metrics,
    );

    service.onModuleInit();
    service.onModuleDestroy();

    expect(metrics.of('oauthCleanup')).toEqual([[{}]]);
  });

  it('com o OAuth desligado nada é agendado nem marcado', () => {
    const metrics = new SpyAppMetrics();
    const service = new OAuthCleanupService(
      { enabled: false } as never,
      {} as never,
      {} as never,
      {} as never,
      metrics,
    );

    service.onModuleInit();

    expect(metrics.of('oauthCleanup')).toEqual([]);
  });
});
