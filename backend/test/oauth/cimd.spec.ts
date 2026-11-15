import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OAuthError } from '../../src/application/oauth/errors/oauth.error';
import {
  authorize,
  authorizeParams,
  buildOAuthStack,
  CLAUDE_CALLBACK,
  CLAUDE_CODE_CLIENT,
  pkcePair,
  tokenInput,
  type OAuthStack,
} from '../helpers/oauth-fixture';

const CLIENT = 'https://app.example.org/oauth/client.json';

function document(overrides: Record<string, unknown> = {}) {
  return {
    client_id: CLIENT,
    client_name: 'Meu App',
    redirect_uris: ['http://localhost:7777/callback'],
    token_endpoint_auth_method: 'none',
    ...overrides,
  };
}

let stack: OAuthStack;

function serve(url: string, doc: unknown, maxAgeSeconds: number | null = null) {
  stack.fetcher.documents.set(url, { ok: true, document: doc, maxAgeSeconds });
}

async function resolveError(clientId: string) {
  const error = await stack.resolveClient.execute(clientId).then(
    () => null,
    (caught: unknown) => caught,
  );

  expect(error).toBeInstanceOf(OAuthError);

  return error as OAuthError;
}

beforeEach(() => {
  stack = buildOAuthStack();
});

describe('CIMD: resolução do client_id em formato de URL', () => {
  it('resolve um documento válido', async () => {
    serve(CLIENT, document());

    await expect(stack.resolveClient.execute(CLIENT)).resolves.toEqual({
      clientId: CLIENT,
      name: 'Meu App',
      redirectUris: ['http://localhost:7777/callback'],
      source: 'cimd',
      verifiedOrigin: false,
    });
  });

  it('o documento do próprio Claude é "verificado" pela origem', async () => {
    serve(
      CLAUDE_CODE_CLIENT,
      document({
        client_id: CLAUDE_CODE_CLIENT,
        client_name: 'Claude Code',
      }),
    );

    await expect(
      stack.resolveClient.execute(CLAUDE_CODE_CLIENT),
    ).resolves.toMatchObject({ verifiedOrigin: true });
  });

  it('client_id do documento diferente da URL é recusado', async () => {
    serve(CLIENT, document({ client_id: 'https://outro.example.org/x' }));

    expect((await resolveError(CLIENT)).code).toBe('invalid_client');
  });

  it.each([
    [
      'redirect fora da allowlist',
      { redirect_uris: ['https://evil.example/cb'] },
    ],
    ['redirect javascript:', { redirect_uris: ['javascript:alert(1)'] }],
    ['sem client_name', { client_name: undefined }],
    ['sem redirect_uris', { redirect_uris: undefined }],
    [
      'cliente confidencial',
      { token_endpoint_auth_method: 'client_secret_post' },
    ],
  ])('documento inválido: %s', async (_label, patch) => {
    serve(CLIENT, document(patch));

    expect((await resolveError(CLIENT)).code).toBe('invalid_client');
  });

  it.each([
    'https://app.example.org',
    'https://app.example.org/',
    'http://app.example.org/client.json',
    'https://user:pass@app.example.org/client.json',
    'https://app.example.org/client.json#frag',
    'https://app.example.org/a/../client.json',
    'https://APP.example.org/client.json',
  ])('URL de client_id inválida: %s', async (url) => {
    serve(url, document({ client_id: url }));

    const result = await stack.resolveClient.execute(url).then(
      () => 'ok',
      (error: OAuthError) => error.code,
    );

    expect(result).toBe('invalid_client');
  });

  it.each([
    'blocked',
    'unreachable',
    'timeout',
    'not_json',
    'too_large',
    'redirect',
  ] as const)(
    'falha de busca (%s) vira invalid_client e NÃO é cacheada',
    async (reason) => {
      stack.fetcher.documents.set(CLIENT, { ok: false, reason });

      expect((await resolveError(CLIENT)).code).toBe('invalid_client');

      serve(CLIENT, document());

      await expect(stack.resolveClient.execute(CLIENT)).resolves.toBeDefined();
    },
  );

  it('documento que não é objeto é recusado', async () => {
    serve(CLIENT, ['x']);

    expect((await resolveError(CLIENT)).code).toBe('invalid_client');
  });

  it('cache em memória: busca uma vez e respeita o mínimo de 5 min', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    serve(CLIENT, document(), 1);

    await stack.resolveClient.execute(CLIENT);
    await stack.resolveClient.execute(CLIENT);
    expect(stack.fetcher.calls).toBe(1);

    vi.setSystemTime(Date.now() + 4 * 60_000);
    await stack.resolveClient.execute(CLIENT);
    expect(stack.fetcher.calls).toBe(1);

    vi.setSystemTime(Date.now() + 2 * 60_000);
    await stack.resolveClient.execute(CLIENT);
    expect(stack.fetcher.calls).toBe(2);
    vi.useRealTimers();
  });

  it('cache respeita o máximo de 24 h mesmo com max-age maior', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    serve(CLIENT, document(), 10 * 24 * 3600);

    await stack.resolveClient.execute(CLIENT);
    vi.setSystemTime(Date.now() + 25 * 3600_000);
    await stack.resolveClient.execute(CLIENT);

    expect(stack.fetcher.calls).toBe(2);
    vi.useRealTimers();
  });
});

describe('CIMD: fluxo de autorização', () => {
  it('o redirect_uri do pedido precisa constar no documento', async () => {
    serve(CLIENT, document());
    const { challenge } = pkcePair();

    await expect(
      stack.preview.execute(
        authorizeParams(CLIENT, challenge, {
          redirect_uri: CLAUDE_CALLBACK,
        }),
      ),
    ).rejects.toMatchObject({ code: 'invalid_request' });
  });

  it('loopback do documento aceita outra porta', async () => {
    serve(CLIENT, document());
    const { challenge } = pkcePair();

    await expect(
      stack.preview.execute(
        authorizeParams(CLIENT, challenge, {
          redirect_uri: 'http://localhost:60000/callback',
        }),
      ),
    ).resolves.toMatchObject({ client: { verified: false } });
  });

  it('persiste o cliente na primeira aprovação e o /token funciona sem nova busca', async () => {
    serve(CLIENT, document());
    const { code, verifier } = await authorize(stack, CLIENT, {
      extra: { redirect_uri: 'http://localhost:7777/callback' },
    });

    expect([...stack.clients.clients.values()]).toHaveLength(1);

    stack.fetcher.documents.clear();

    await expect(
      stack.exchange.execute(
        tokenInput(CLIENT, code, verifier, {
          redirectUri: 'http://localhost:7777/callback',
        }),
      ),
    ).resolves.toMatchObject({ token_type: 'Bearer' });
  });

  it('um client_id https:// que só existe como DCR não é aceito (DCR não usa URL)', async () => {
    const { challenge } = pkcePair();

    await expect(
      stack.preview.execute(authorizeParams(CLIENT, challenge)),
    ).rejects.toMatchObject({ code: 'invalid_client' });
  });
});
