#!/usr/bin/env node
/**
 * Prova repetível de que o OAuth do Trampo Flow funciona de ponta a ponta,
 * sem dependências: percorre o mesmo caminho que o Claude (descoberta a partir
 * do 401 do /mcp, registro dinâmico, login, consentimento, troca do código,
 * chamada ao MCP, refresh e revogação).
 *
 *   BASE_URL=https://trampo-flow.neubergerdev.com.br \
 *   E2E_EMAIL=... E2E_PASSWORD=... node scripts/oauth-smoke.mjs
 *
 * Variáveis:
 *   BASE_URL      endereço público do ingress (padrão http://localhost:5173)
 *   API_PATH      prefixo da API no ingress (padrão /api)
 *   E2E_EMAIL     e-mail da conta usada no teste (obrigatória)
 *   E2E_PASSWORD  senha dessa conta (obrigatória)
 *
 * Use uma conta de teste: o script só lê (não cria nem apaga candidaturas) e
 * revoga o aplicativo que autorizou ao final. Nenhum segredo é impresso.
 * O registro de clientes tem limite de 5 por minuto por IP: se rodar várias
 * vezes seguidas, espere um minuto.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';

const BASE = (process.env.BASE_URL ?? 'http://localhost:5173').replace(
  /\/+$/,
  '',
);
const API = `${BASE}${process.env.API_PATH ?? '/api'}`;
const { E2E_EMAIL, E2E_PASSWORD } = process.env;
const CALLBACK = 'https://claude.ai/api/mcp/auth_callback';

if (!E2E_EMAIL || !E2E_PASSWORD) {
  console.error('Defina E2E_EMAIL e E2E_PASSWORD (conta de teste).');
  process.exit(2);
}

let failures = 0;

function check(label, ok, detail = '') {
  console.log(
    `${ok ? 'OK   ' : 'FALHA'} ${label}${detail ? ` (${detail})` : ''}`,
  );

  if (!ok) {
    failures += 1;
  }
}

async function request(method, url, { headers = {}, json, form } = {}) {
  const init = { method, headers: { ...headers } };

  if (json !== undefined) {
    init.body = JSON.stringify(json);
    init.headers['content-type'] = 'application/json';
  }

  if (form) {
    init.body = new URLSearchParams(form).toString();
    init.headers['content-type'] = 'application/x-www-form-urlencoded';
  }

  const response = await fetch(url, init);
  const text = await response.text();
  let body = text;

  try {
    body = JSON.parse(text);
  } catch {
    // corpo que não é JSON (ex.: HTML)
  }

  return { status: response.status, headers: response.headers, body };
}

const mcp = (token, method, params) =>
  request('POST', `${BASE}/mcp`, {
    headers: {
      accept: 'application/json, text/event-stream',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    json: { jsonrpc: '2.0', id: 1, method, params },
  });

function stop(message) {
  console.error(`\nInterrompido: ${message}`);
  process.exit(1);
}

console.log(`Testando ${BASE}\n`);

// 1. Descoberta, como o Claude faz: o 401 do /mcp aponta para a metadata.
const unauthorized = await mcp(undefined, 'tools/list');
const challenge = unauthorized.headers.get('www-authenticate') ?? '';
const prmUrl = /resource_metadata="([^"]+)"/.exec(challenge)?.[1];

check(
  'o /mcp sem token responde 401 com resource_metadata',
  unauthorized.status === 401 && Boolean(prmUrl),
  `status ${unauthorized.status}`,
);

if (!prmUrl) {
  stop('OAuth desligado ou ingress sem as rotas novas (OAUTH_ENABLED=false?).');
}

const prm = await request('GET', prmUrl);

check(
  'metadata do recurso: resource é a URL do MCP e há um servidor de autorização',
  prm.status === 200 &&
    prm.body.resource === `${BASE}/mcp` &&
    prm.body.authorization_servers?.length === 1,
  prm.body.resource,
);

const issuer = prm.body.authorization_servers?.[0];
const metadata = await request(
  'GET',
  `${issuer}/.well-known/oauth-authorization-server`,
);

check(
  'metadata do servidor: PKCE S256 e cliente público',
  metadata.status === 200 &&
    metadata.body.code_challenge_methods_supported?.join() === 'S256' &&
    metadata.body.token_endpoint_auth_methods_supported?.join() === 'none',
);

if (metadata.status !== 200) {
  stop('não foi possível ler a metadata do servidor de autorização.');
}

const resource = prm.body.resource;

// 2. Registro dinâmico (cliente público, sem segredo).
const registration = await request(
  'POST',
  metadata.body.registration_endpoint,
  {
    json: {
      client_name: 'Trampo Flow smoke test',
      redirect_uris: [CALLBACK],
      token_endpoint_auth_method: 'none',
    },
  },
);

check(
  'registro dinâmico (DCR) devolve client_id sem client_secret',
  registration.status === 201 && !('client_secret' in registration.body),
  `status ${registration.status}`,
);

if (registration.status !== 201) {
  stop('o registro falhou (limite de 5 por minuto?).');
}

const clientId = registration.body.client_id;

// 3. Login da pessoa (sessão) e consentimento.
const login = await request('POST', `${API}/auth/login`, {
  json: { email: E2E_EMAIL, password: E2E_PASSWORD },
});
const session = { authorization: `Bearer ${login.body.accessToken}` };

check(
  'login da conta de teste',
  login.status === 200 && Boolean(login.body.accessToken),
  `status ${login.status}`,
);

if (!login.body.accessToken) {
  stop('login recusado (e-mail/senha ou verificação de e-mail pendente).');
}

const verifier = randomBytes(32).toString('base64url');
const authorizeParams = {
  response_type: 'code',
  client_id: clientId,
  redirect_uri: CALLBACK,
  code_challenge: createHash('sha256').update(verifier).digest('base64url'),
  code_challenge_method: 'S256',
  scope: 'applications:read applications:write',
  state: randomUUID(),
  resource,
};

const preview = await request(
  'GET',
  `${API}/oauth/authorize/preview?${new URLSearchParams(authorizeParams)}`,
  { headers: session },
);

check(
  'preview do consentimento lista o que não pode (apagar)',
  preview.status === 200 &&
    preview.body.cannotDo?.includes('apagar candidaturas'),
);

const plain = await request('POST', `${API}/oauth/authorize/decision`, {
  headers: session,
  json: { ...authorizeParams, code_challenge_method: 'plain', approve: true },
});

check('PKCE "plain" é recusado', plain.status === 400);

const decision = await request('POST', `${API}/oauth/authorize/decision`, {
  headers: session,
  json: { ...authorizeParams, approve: true },
});
const redirect = decision.body.redirectTo
  ? new URL(decision.body.redirectTo)
  : null;
const code = redirect?.searchParams.get('code');

check(
  'aprovação devolve code, state e iss',
  Boolean(code) &&
    redirect.searchParams.get('state') === authorizeParams.state &&
    redirect.searchParams.get('iss') === issuer,
);

if (!code) {
  stop('não veio código de autorização.');
}

// 4. Troca do código.
const tokenForm = {
  grant_type: 'authorization_code',
  code,
  redirect_uri: CALLBACK,
  client_id: clientId,
  code_verifier: verifier,
  resource,
};
const wrongVerifier = await request('POST', metadata.body.token_endpoint, {
  form: { ...tokenForm, code_verifier: randomBytes(32).toString('base64url') },
});

check(
  'verifier errado dá invalid_grant',
  wrongVerifier.status === 400 && wrongVerifier.body.error === 'invalid_grant',
);

const tokens = await request('POST', metadata.body.token_endpoint, {
  form: tokenForm,
});

check(
  'troca do código emite access (tfo_) e refresh (tfr_)',
  tokens.status === 200 &&
    tokens.body.access_token?.startsWith('tfo_') &&
    tokens.body.refresh_token?.startsWith('tfr_'),
);

if (tokens.status !== 200) {
  stop('a troca do código falhou.');
}

const bearer = { authorization: `Bearer ${tokens.body.access_token}` };

// 5. Uso do access token.
const tools = await mcp(tokens.body.access_token, 'tools/list');

check(
  'o MCP lista as ferramentas com o tfo_',
  tools.status === 200 && (tools.body.result?.tools?.length ?? 0) > 0,
  `${tools.body.result?.tools?.length ?? 0} ferramentas`,
);

const stats = await request('GET', `${API}/applications/stats`, {
  headers: bearer,
});

check('o tfo_ lê candidaturas (escopo de leitura)', stats.status === 200);

const forbidden = [
  ['GET', '/auth/me'],
  ['GET', '/auth/tokens'],
  ['GET', '/oauth/grants'],
  ['DELETE', `/applications/${randomUUID()}`],
];

for (const [method, path] of forbidden) {
  const response = await request(method, `${API}${path}`, { headers: bearer });

  check(
    `o tfo_ NÃO alcança ${method} ${path}`,
    response.status === 403,
    `status ${response.status}`,
  );
}

// 6. Refresh rotativo.
const refreshed = await request('POST', metadata.body.token_endpoint, {
  form: {
    grant_type: 'refresh_token',
    refresh_token: tokens.body.refresh_token,
    client_id: clientId,
  },
});

check(
  'refresh rotaciona o refresh token',
  refreshed.status === 200 &&
    refreshed.body.refresh_token !== tokens.body.refresh_token,
);

if (refreshed.status !== 200) {
  stop('o refresh falhou.');
}

// 7. Revogação.
await request('POST', metadata.body.revocation_endpoint, {
  form: { token: refreshed.body.refresh_token },
});

const afterRevoke = await request('GET', `${API}/auth/whoami`, {
  headers: { authorization: `Bearer ${refreshed.body.access_token}` },
});
const refreshAfterRevoke = await request('POST', metadata.body.token_endpoint, {
  form: {
    grant_type: 'refresh_token',
    refresh_token: refreshed.body.refresh_token,
    client_id: clientId,
  },
});

check(
  'revogado: o access token responde 401',
  afterRevoke.status === 401,
  `status ${afterRevoke.status}`,
);
check(
  'revogado: o refresh dá invalid_grant',
  refreshAfterRevoke.body.error === 'invalid_grant',
);

console.log(
  failures === 0 ? '\nTudo certo.' : `\n${failures} verificação(ões) falharam.`,
);
process.exit(failures === 0 ? 0 : 1);
