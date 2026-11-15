# Plano: OAuth 2.1 para o MCP (3.1.1 e 3.2.0)

> **Para quem for retomar este trabalho (outro agente ou pessoa):** este arquivo é autossuficiente. Leia as seções 1 a 4 antes de tocar em código, execute **uma fase por vez, um PR por fase**, e marque os `[ ]` conforme concluir. Nada aqui foi implementado ainda. As decisões da seção 3 já foram conversadas com o dono do projeto; o que ainda depende dele está na seção 14.

## 0. Estratégia de entrega (atualizada em 2026-11-15)

O dono decidiu o seguinte fluxo, que **substitui** o de "release 3.1.1 separada":

- Existe uma branch de integração **`release/v3.2.0`**, criada a partir da `main`. **Todos os PRs deste plano têm `release/v3.2.0` como base**, nunca a `main`. Quem implementa abre cada PR, espera o CI ficar verde e faz o merge (squash) na branch de release.
- A **3.1.1 deixa de existir como release própria**: o aviso e o guia do `tfp_` (Fase 0) viajam dentro da 3.2.0. Não há bump nem tag `v3.1.1`.
- Ao final, **um único PR `release/v3.2.0` → `main`**, aberto por quem implementa e **mesclado pelo dono**. O bump de versão, o CHANGELOG e a tag `v3.2.0` só acontecem depois disso e da validação.
- O `ci.yml` passou a rodar também em PRs para `release/**`; os PRs intermediários têm CI.
- **Ambiente local do dono:** a stack Docker local (`docker compose`, projeto `trampo-flow`) é atualizada a cada PR mesclado, para o teste ponta a ponta no fim. O `docker-compose.override.yml` local (fora do git, listado em `.git/info/exclude`) liga `OAUTH_ENABLED=true` e define `OAUTH_ISSUER=http://localhost:5173` e `MCP_PUBLIC_URL=http://localhost:5173/mcp`, porque o `.env` do dono aponta `APP_BASE_URL` para produção. O Claude real exige URL pública; localmente o teste é com MCP Inspector, Claude Code e o `scripts/oauth-smoke.mjs`.

Sequência de PRs (cada um verde e com testes): **PR0** aviso + guia do `tfp_`; **PR1** escopos (`tfp_` somente leitura, guard fechado por padrão, `/auth/whoami`); **PR2** servidor de autorização; **PR3** MCP + infra; **PR4** frontend; **PR5** guia do OAuth e documentação.

## 0.1 Status da execução (checkpoint de 2026-11-15)

> **Esta seção é a fonte da verdade do andamento.** Os `[ ]` das seções 5 a 12 não foram todos atualizados; confie na tabela abaixo e, em dúvida, no código da `release/v3.2.0`.

| PR  | Conteúdo                                                                                                       | Estado                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| #58 | Plano e CI rodando em PRs para `release/**`                                                                    | Mesclado                                                                              |
| #59 | PR 0: guia do `tfp_` (`docs/guia-conexao-mcp.md`, parte B), aviso na tela, tabela de compatibilidade no README | Mesclado                                                                              |
| #60 | PR 1: `tfp_` com escopo (somente leitura), guard negado por padrão, `@RequiredScope`, `GET /auth/whoami`       | Mesclado (revisão de segurança sem achados)                                           |
| #62 | PR 2: servidor de autorização (fase 1) + ramo `tfo_` no guard, atrás de `OAUTH_ENABLED`                        | Mesclado (revisão de segurança sem achados; teste ao vivo em stack isolada OK)        |
| #63 | PR 3: MCP (metadata do recurso, 401 com `resource_metadata`, `tfo_`) + infra (nginx, compose, variáveis)       | Mesclado (teste ao vivo com ingress, flag ligada e desligada, OK)                     |
| #64 | PR 4: frontend (tela de permissão, "Aplicativos conectados", painel "Como conectar")                           | Mesclado (testes de componente e rotas ao vivo; **tela não vista em navegador real**) |
| —   | PR 5: guia do OAuth (parte A), README, `scripts/oauth-smoke.mjs`, CHANGELOG, bump para 3.2.0                   | Pendente                                                                              |
| —   | PR `release/v3.2.0` → `main`: aberto por quem implementa, **mesclado só pelo dono**                            | Pendente                                                                              |

**Já feito do que o plano pedia para o PR 1/Fase 2:** coluna `scope` no token, `PersonalAccessToken.scope`, DTO e UI com o seletor de permissões, `@RequiredScope` em todas as rotas de candidaturas, deny-by-default para `pat`, `403 insufficient_scope` com `WWW-Authenticate`, `GET /auth/whoami` (o MCP já valida por ele) e o teste `backend/test/infrastructure/required-scope.spec.ts`, que trava a lista de rotas abertas ao token. **Fase 2 concluída no PR 2:** variante `oauth` de `AuthenticatedUser`, ramo `tfo_` no guard e `resource_metadata` no header de `insufficient_scope`.

**Decisões tomadas na execução** (além da seção 3): a 3.1.1 não existe (o guia do `tfp_` foi dentro da 3.2.0); os pontos em aberto da seção 14 seguem com os padrões recomendados (allowlist de redirect = Claude + loopback + `OAUTH_EXTRA_REDIRECT_URIS`; durações 1 h / 30 dias; entrega escura com `OAUTH_ENABLED`); a ponte `mcp-remote` ficou **sem testar** de propósito (o ambiente negou a execução de um pacote de terceiros) e está marcada assim no guia.

### Ambiente local do dono (container)

- Projeto Compose `trampo-flow` (raiz do repositório), ingress em `http://localhost:5173`. Está no código do PR 1. **Atualizar depois de cada PR mesclado**: `git checkout release/v3.2.0 && git pull`, `docker compose up -d --build` e **`docker compose restart ingress`** (o `nginx.conf` é volume montado e o ingress não é recriado sozinho). Conferir com `curl -i http://localhost:5173/api/health` e uma rota nova do PR.
- O `.env` do dono aponta `APP_BASE_URL` para **produção**; **não editar o `.env`**. Para o OAuth local, criar na raiz um `docker-compose.override.yml` (já listado em `.git/info/exclude`, não vai para o Git) com, nos serviços `api` e `mcp`: `OAUTH_ENABLED: 'true'`, `OAUTH_ISSUER: http://localhost:5173` e `MCP_PUBLIC_URL: http://localhost:5173/mcp`.
- O dono fará o teste ponta a ponta no fim, localmente: MCP Inspector, Claude Code e `scripts/oauth-smoke.mjs`. O Claude web e o celular exigem URL pública (produção).

### Rotina por PR (a que funcionou)

1. `git checkout release/v3.2.0 && git pull`, branch nova a partir dela, **testes primeiro** nos pontos de segurança.
2. Verificações locais no pacote tocado: `npm run lint`, `npm run typecheck` (backend: `npm run test:typecheck`), testes, `npm run build`; na raiz `npm run format:check`. Testes com Postgres: ver a receita da seção 10 (`TEST_DATABASE_URL` com banco terminando em `_test`).
3. Teste ao vivo numa **stack isolada** (nunca no banco do dono): `docker compose -p <nome> --env-file <arquivo> up -d --build` com `POSTGRES_PORT=55435`, `WEB_PORT=5175`, `MAILPIT_PORT=8027`, `JWT_SECRET` e `AUTH_TOKEN_SECRET` de `openssl rand -hex 24`, `CORS_ORIGINS=http://localhost:5175`; usuário por `DATABASE_URL=postgresql://trampo:trampo_dev@127.0.0.1:55435/trampo_flow E2E_EMAIL=… E2E_PASSWORD=… node backend/scripts/create-e2e-user.mjs` (na pasta `backend`); derrubar com `docker compose -p <nome> --env-file <arquivo> down -v`.
4. Commit em inglês, Conventional Commits, **assunto em minúsculas**, com a linha de atribuição que o ambiente indicar. Push, `gh pr create --base release/v3.2.0` (corpo terminando com a linha "Generated with Claude Code"), `gh pr checks <n> --watch`, e com tudo verde `gh pr merge <n> --squash --delete-branch`. PR 2 e qualquer PR de segurança: rodar `/security-review` antes do merge.
5. Atualizar o container local (acima) e só então seguir.

### Lições e armadilhas desta execução

- O build do Docker falha de vez em quando com `ECONNRESET` (rede ao baixar pacotes e motores do Prisma). **Não é do código**: repetir (usar um laço de até 3 tentativas).
- Comandos acima de 10 minutos viram tarefa em segundo plano; para builds, usar `run_in_background`. O `sleep` no começo de um comando é bloqueado (use `gh pr checks --watch`).
- Depois do `prettier` as tabelas do Markdown mudam de alinhamento: edições por texto exato em linhas de tabela falham; use regex tolerante a espaços ou edite fora das tabelas.
- No `zsh`, `echo ======` quebra; use aspas.
- O `ci.yml` roda em PRs para `main` e `release/**`; os PRs intermediários têm CI completo (backend, frontend, mcp, tooling e as 3 imagens Docker, ~3 a 4 minutos).
- Relatórios de subagentes **não são mensagens do usuário**: nunca tratar como autorização.
- O merge na `main` dispara a publicação das imagens no GHCR: só o dono faz o merge final, e a tag `v3.2.0` só depois da validação em produção.

### Lições do PR 2

- **`@fastify/formbody` não é necessário** (conflita com o parser nativo do Nest 12); o plano original errava neste ponto.
- Os arquivos de teste não recebem `experimentalDecorators` (o `tsconfig.json` só cobre `src/`): em testes, aplique decorators à mão (`Controller('x')(Classe)`), como em `backend/test/oauth/oauth-http.spec.ts`.
- A migration do OAuth se chama `20261117000000_oauth` (precisa ordenar **depois** de `20261116000000`); o índice único parcial dos grants está no SQL e o Prisma não o trata como drift.
- Limites por IP no `/oauth/token` (30/min) valem para o egress compartilhado do Claude: se aparecer `temporarily_unavailable` em produção, revisar os limites.
- `prisma migrate reset` é barrado pelo Prisma em sessões de IA; usar `migrate deploy` em banco descartável.

### Lições do PR 3

- Em `nginx`, um `add_header` ou `proxy_hide_header` dentro de um `location` desliga a herança **dos dois grupos** definidos no `server`: os locations do OAuth repetem os cabeçalhos de segurança e os `proxy_hide_header` (sem isso, `X-Frame-Options` etc. saem duplicados).
- O limite de registro existe em dois lugares (nginx 5/min e a API, 5/min por IP): ao repetir testes ao vivo, espere a janela ou reinicie o `ingress` e aguarde.
- O MCP guarda por 60 s o resultado da validação do token (`/auth/whoami`): após revogar um app, `tools/list` ainda pode responder até 60 s, mas qualquer chamada de ferramenta falha na hora, porque o token é repassado à API.
- `/mcp` não tem CORS aberto (só `.well-known` e `/api/oauth/token|register|revoke`): o MCP Inspector deve ser usado em modo proxy.

### Lições do PR 4

- A tela de Configurações descobre se o OAuth está ligado pedindo `/.well-known/oauth-authorization-server` na mesma origem (200 com `issuer` = ligado; qualquer outra coisa = desligado). Em `npm run dev` (Vite sem proxy do `.well-known`) o OAuth aparece desligado.
- A tela `/oauth/authorize` só segue o `redirectTo` devolvido pelo servidor e recusa esquemas que não sejam http/https; pedido inválido mostra o motivo e não redireciona.
- A Configurações não tem baseline visual (`frontend/e2e`), então nenhum baseline precisou ser regenerado.

### Pendências manuais (dependem do dono)

Ver a tela de consentimento e o painel de Configurações em um navegador real (só foram cobertos por testes de componente); testar em clientes reais o que o guia marca como "não testado": Cursor, VS Code, a ponte `mcp-remote` e o celular; e, depois do OAuth no ar, o Claude web, o celular e o Claude Desktop em produção com a flag ligada (conferir também o plano do Claude necessário para conectores personalizados e o Cloudflare, seção 11).

## 1. Objetivo e escopo

Hoje o MCP hospedado em `/mcp` (3.1.0) exige que a pessoa crie um token `tfp_` em Configurações e o cole num cabeçalho. Isso funciona no Claude Code, mas **não no Claude web, no celular nem no Claude Desktop pela URL**, que só se autenticam por OAuth.

Entregas:

| Versão | O que entrega                                                                                                                                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1.1  | Aviso claro, na tela e no README, de onde o MCP funciona hoje, e o **guia de uso do `tfp_`** (seção 5). Sem backend.                                                                                                   |
| 3.2.0  | OAuth 2.1: o Trampo Flow vira um conector que se adiciona só com a URL `https://trampo-flow.neubergerdev.com.br/mcp`. A pessoa faz login (senha ou Google), aprova e pronto, sem ver nem copiar token (seções 6 a 12). |

O token `tfp_` **continua existindo** (decisão 11) e passa a poder ser criado como "só leitura" (decisão 12). O dono quer **instruções de uso para cada forma de conexão, por OAuth e por `tfp_`** (decisão 13, seções 5 e 12): o guia do `tfp_` sai já na 3.1.1, o do OAuth na 3.2.0. Motivação do dono: usar no Claude web e no celular e compor portfólio, então as **decisões e os testes de segurança importam tanto quanto o código** (seção 13).

## 2. Compatibilidade por cliente (corrigida)

Uma versão anterior deste plano dizia que o Claude Desktop funcionava hoje. **Não funciona pela URL hospedada**: o `claude_desktop_config.json` só aceita servidores locais (`command`), então no Desktop só dá pelo modo stdio local (clonar o repo e rodar `mcp/dist/index.js`) ou por uma ponte tipo `mcp-remote`.

| Cliente                                        | Hoje (3.1.0/3.1.1)                                                                   | Depois do OAuth (3.2.0) |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| Claude Code (terminal)                         | Funciona: `claude mcp add --transport http … --header "Authorization: Bearer tfp_…"` | Funciona sem token      |
| Cursor, VS Code e outros que aceitam cabeçalho | Funciona                                                                             | Funciona                |
| Claude Desktop                                 | Só pelo modo local (stdio) ou ponte (`mcp-remote`, **não testada aqui**)             | Funciona como conector  |
| Claude web (claude.ai)                         | Não                                                                                  | Funciona                |
| Claude no celular                              | Não                                                                                  | Funciona\*              |

\* Pela doc da Anthropic o conector é adicionado no claude.ai e passa a valer no app. **A validar** na prática. Também **a validar**: o plano do Claude necessário (uma fonte da Anthropic lista só planos pagos, outra inclui o Free).

## 3. Decisões

Todas foram apresentadas ao dono, que as aceitou sem objeções (as marcadas "recomendação" não foram contestadas; confirme na seção 14 se houver dúvida).

1. **A API é o servidor de autorização; o `mcp/` é o servidor de recursos.** Sem IdP externo: login, sessão e Google já existem. Cliente OAuth = Claude.
2. **Tokens opacos, não JWT.** Access `tfo_…` (1 h) e refresh `tfr_…` (30 dias, rotativo), 32 bytes aleatórios em base64url, guardados só como HMAC (`HmacTokenHasher`, `AUTH_TOKEN_SECRET`), igual ao PAT. Revogar corta o acesso na hora.
3. **Escopos:** `applications:read` e `applications:write`. **Nenhum escopo apaga**: `DELETE /applications/:id` continua `@SessionOnly()`. `offline_access` é aceito e anunciado (o Claude o acrescenta para obter refresh token).
4. **Deny-by-default.** Token `oauth` e `pat` só alcançam rotas que **declaram** um escopo (`@RequiredScope`). Hoje o PAT alcança rotas que não deveria (`PATCH /auth/me/theme`, `POST /auth/verification/resend`). Sessão (JWT) segue com tudo.
5. **Audiência.** O token nasce com `resource = MCP_PUBLIC_URL` (`https://<host>/mcp`) e a API só o aceita com essa audiência (`invalid_target` se outro). O `mcp/` repassa o token à **API própria** (mesmo domínio de confiança), que valida audiência e escopo. É um desvio **consciente** da regra de "token passthrough" da spec, que mira APIs de terceiros; evita criar um segundo token interno. Registrar isto na documentação (seção 12).
6. **Registro de clientes: CIMD e DCR**, só clientes **públicos** (`token_endpoint_auth_method: none`). A spec 2026-07-28 deprecia o DCR em favor do CIMD, mas o Claude ainda registra por DCR; CIMD é o caminho principal, DCR é compatibilidade.
7. **Redirect URIs por allowlist** (mesma política para DCR e CIMD): `https://claude.ai/api/mcp/auth_callback`, `https://claude.com/api/mcp/auth_callback` (a Anthropic avisa que pode migrar), loopback (`http://localhost`, `http://127.0.0.1`, `http://[::1]`, qualquer porta, mesmo caminho) e extras via `OAUTH_EXTRA_REDIRECT_URIS`. O resto é recusado.
8. **Consentimento é uma página do frontend** (`/oauth/authorize`) atrás do login existente. Sem HTML no servidor. A decisão vai por `POST` autenticado com o JWT de sessão em `Authorization` (não cookie), então não há CSRF. O nginx já envia `X-Frame-Options: DENY` (anti-clickjacking).
9. **Entrega escura:** tudo atrás de `OAUTH_ENABLED` (padrão `false`). Sem a flag, as rotas e a metadata não existem e o `401` do MCP continua como hoje.
10. **Durações (recomendação):** access 1 h, refresh 30 dias com rotação, código 60 s.
11. **O `tfp_` permanece.** Fica como caminho para o modo stdio local (o `mcp/` exige `tfp_` nele), para automação e testes (sem navegador), para clientes sem OAuth e como plano B se o OAuth ou a flag estiverem fora. Não há usuários dele hoje, então remover seria barato, mas tira capacidade sem ganho. Reavaliar com dados (a tela já mostra o último uso de cada token). O OAuth é o caminho padrão para o usuário final; o `tfp_` é o caminho de quem automatiza a própria conta. Automação **não** deve usar OAuth: o fluxo exige navegador, o access token dura 1 h e o refresh rotativo revoga a família se dois processos renovarem ao mesmo tempo.
12. **`tfp_` com escopo.** Ao criar o token, a pessoa escolhe **Leitura e escrita** (padrão, mantém o comportamento atual) ou **Somente leitura**. Os escopos ficam gravados no token (coluna `scope`, mesmos nomes `applications:read` / `applications:write`) e o guard usa o gravado, em vez de assumir os dois. Para automações que só consultam (relatório semanal, resumo do funil).
13. **Documentação por forma de conexão é entrega obrigatória**, não um extra: cada método tem guia próprio, testado por quem escreve e revisado seguindo-o do zero (seção 12.1).

## 4. Estado atual do repositório (o que existe e será reaproveitado)

Monorepo `trampo-flow-software` (branch `main`, tag `v3.1.0`, commit `b0f8b51`):

- `backend/`: NestJS 12 + Fastify + Prisma 6 + Postgres 16, camadas `domain` / `application` / `infrastructure`. Rotas **sem prefixo global**; o nginx remove `/api`.
- `frontend/`: React 19 + Vite + TanStack Query + react-router 7. Rotas em português (`/candidaturas`, `/configuracoes`).
- `mcp/`: SDK `@modelcontextprotocol/sdk` 1.32.2 + zod 4. Modos stdio (`src/index.ts`) e Streamable HTTP sem estado (`src/http.ts`, `src/http-main.ts`, porta 3100).
- `infra/ingress/nginx.conf` e `docker-compose.yml` (serviços `postgres`, `api`, `mcp`, `web`, `ingress`, `mailpit`).

Peças existentes para reaproveitar (caminhos relativos a `backend/src/`):

| O quê                                                                                 | Onde                                                                                                                                                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Guard global (registrado como `APP_GUARD` em `infrastructure/modules/auth.module.ts`) | `infrastructure/auth/jwt-auth.guard.ts`                                                                                                                                  |
| `request.user = { sub, authMethod: 'jwt' \| 'pat', tokenId? }`                        | mesmo arquivo, tipos `AuthenticatedUser` e `AuthenticatedRequest`                                                                                                        |
| Decorators `@Public()`, `@SessionOnly()`, `@CurrentUserId()`                          | `infrastructure/auth/public.decorator.ts`, `session-only.decorator.ts`, `current-user-id.decorator.ts`                                                                   |
| HMAC de tokens (`AUTH_TOKEN_SECRET`)                                                  | `infrastructure/auth/hmac-token-hasher.ts` (porta `domain/auth/services/token-hasher.ts`)                                                                                |
| Modelo de token longo, hash, prefixo, revogação, `lastUsedAt` com throttle            | `PersonalAccessToken`: entidade, repositório, use cases `*-personal-access-token*`, controller, migration `20261115000000`                                               |
| Rotação de refresh com janela de graça e revogação da família                         | `application/auth/use-cases/refresh-session.use-case.ts`, `domain/auth/services/refresh-token-policy.ts`                                                                 |
| Rate limit em memória                                                                 | `infrastructure/auth/rate-limiter.service.ts` (`consume(key, limit, windowMs)`)                                                                                          |
| Guarda anti-SSRF (IP público)                                                         | `infrastructure/http/job-page/public-address.ts` (`isPublicAddress`) e `safe-http-job-page-fetcher.ts` (DNS guardado, redirecionamento manual, timeout, limite de bytes) |
| Filtro de erros de domínio → HTTP                                                     | `infrastructure/http/filters/domain-exception.filter.ts`                                                                                                                 |
| Frontend: login devolve à rota de origem **com query string**                         | `components/auth/ProtectedRoute.tsx` (`state.from`), `pages/LoginPage.tsx`, `utils/url.ts` (`safeRedirectPath` aceita `/x?y=z`)                                          |
| Frontend: cliente HTTP com Bearer em memória e refresh                                | `services/api/client.ts` (`apiClient`, baseURL `/api`)                                                                                                                   |
| Tela de tokens                                                                        | `components/settings/PersonalAccessTokensSection.tsx`, `pages/SettingsPage.tsx`                                                                                          |
| MCP: validação do token e 401                                                         | `mcp/src/http.ts` (`ensureValidToken` chama `GET /auth/me`, cache de 60 s por SHA-256; 401 com `WWW-Authenticate: Bearer realm="trampo-flow"`)                           |

### Armadilhas conhecidas do código atual (leia antes da Fase 1)

1. **`ValidationPipe` global é estrito** (`whitelist`, `forbidNonWhitelisted`, `transform` em `main.ts`). Clientes OAuth enviam parâmetros extras (RFC 7591 permite metadados arbitrários; `/token` pode receber campos que não usamos). Os endpoints OAuth devem **tolerar campos desconhecidos** (receber `Record<string, unknown>` e validar à mão, ou `@UsePipes` com `forbidNonWhitelisted: false`).
2. **Formato de erro.** O `DomainExceptionFilter` devolve `{ error: CODIGO, message }`. OAuth exige RFC 6749: `{ "error": "invalid_grant", "error_description": "…" }`, com `Cache-Control: no-store` (o hook `onSend` de `main.ts` já injeta `no-store`). Criar um filtro próprio (`@UseFilters`) só para o controller OAuth.
3. **`/oauth/token` é `application/x-www-form-urlencoded`**. **Não instale `@fastify/formbody`**: o Nest 12 (`platform-fastify`) já registra esse parser no `init` e o plugin faz a API cair na subida (`Content type parser ... already present`). `/oauth/register` é JSON.
4. **Todos os endpoints OAuth públicos precisam de `@Public()`** (token, register, revoke, metadata). Os endpoints de consentimento (`preview`/`decision`) usam o JWT de sessão e `@SessionOnly()`.
5. **CORS.** `enableCors` só permite as origens de `CORS_ORIGINS`. Clientes de navegador (ex.: **MCP Inspector em modo navegador**) precisam de CORS aberto (`Access-Control-Allow-Origin: *`, sem credenciais) em `/.well-known/*`, `/oauth/token`, `/oauth/register`, `/oauth/revoke`. O Claude web troca o código no servidor dele, então não depende disso. Resolver no nginx (cabeçalhos e resposta a `OPTIONS`) só para esses caminhos.
6. **Headers de segurança.** O hook `onSend` aplica `Content-Security-Policy: default-src 'none'` e `no-store` a toda resposta da API; serve para JSON. Não renderize HTML no backend.
7. **`/auth/me` passa a ser fechado para OAuth** (deny-by-default) e hoje o MCP o usa para validar tokens. Criar `GET /auth/whoami` (devolve só `{ id }`, escopo `applications:read`) e trocar `getMe()` em `mcp/src/api-client.ts`. Assim o token OAuth não lê e-mail nem perfil.
8. **nginx remove `/api`** (`proxy_pass http://api:3000/`). As rotas OAuth ficam em `/api/oauth/*` para o mundo e `/oauth/*` na API. Já as URLs `.well-known` precisam estar na **raiz do host** (o issuer não tem caminho), então exigem `location` próprios, declarados **antes** de `location /`.
9. **Rate limit é em memória** e o IP real vem de `CF-Connecting-IP` (mapa `$client_ip` do nginx). Não é compartilhado entre réplicas (igual ao resto do projeto).

## 5. Fase 0: release 3.1.1 (aviso de compatibilidade e guia do `tfp_`)

Só texto e uma pequena mudança de tela (sem backend). Branch sugerida: `docs/mcp-compat-notice`.

- [ ] `frontend/src/components/settings/PersonalAccessTokensSection.tsx`:
  - Trocar o parágrafo introdutório (cita "Claude Code, Claude Desktop ou qualquer cliente MCP") por um que diga o que realmente funciona.
  - Adicionar um `Alert tone="info"` "Onde funciona hoje": ✅ Claude Code (terminal) e clientes que aceitam cabeçalho (Cursor, VS Code); ⚠️ Claude Desktop só pelo modo local (ver README); ❌ Claude web e celular: em breve, com login por OAuth.
  - Manter o bloco do comando `claude mcp add --transport http` como está.
- [ ] `frontend/src/pages/SettingsPage.test.tsx`: afirmar que o aviso aparece.
- [ ] `README.md`: incluir a tabela da seção 2; corrigir a frase de `Claude Desktop accepts the same command…` (vale **só para o modo stdio local**); ajustar "MCP authentication and token scopes" em "Decisions and known limitations". Tudo em inglês, como o resto do README.
- [ ] **Guia de uso do `tfp_`** (decisão 13): escrever as partes B1 a B5 da seção 12.1 em `docs/guia-conexao-mcp.md` (em português, para ser enviado a quem for usar), com link no README. Na tela de Configurações, mostrar um resumo curto por método ao lado do comando já existente.
- [ ] `CHANGELOG.md`: entrada `3.1.1` (`### Changed`).
- (Sem release própria: vale a seção 0; nada de bump de versão nem tag `v3.1.1` neste PR.)
- **Pronto quando:** testes do frontend passam, `npm run format:check` passa, a tela de Configurações mostra o aviso e o README tem a tabela.

## 6. Fase 1: servidor de autorização (backend)

Branch sugerida: `feat/oauth-server`. Seguir a arquitetura em camadas (domínio sem Nest/Prisma; use cases em `application/oauth/`; Prisma e controllers em `infrastructure/`). Copiar o estilo do PAT (entidade com `create`/`restore`, repositório abstrato, mapper, repositório Prisma, repositório em memória em `test/repositories/`).

### 6.1 Modelo de dados (Prisma + migration `…_oauth`)

| Tabela                 | Campos                                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oauth_clients`        | `id` uuid, `client_id` único (`tfc_…` no DCR; a **URL** no CIMD), `name` (≤ 120), `redirect_uris` text[], `source` (`dcr` \| `cimd`), `created_at`, `last_used_at`                |
| `oauth_grants`         | `id`, `user_id` (cascade), `client_id` (fk), `scope`, `resource`, `created_at`, `last_used_at`, `revoked_at`. Único parcial por (`user_id`, `client_id`) com `revoked_at IS NULL` |
| `oauth_codes`          | `code_hash` único, `grant_id`, `redirect_uri`, `code_challenge`, `expires_at`, `used_at`                                                                                          |
| `oauth_access_tokens`  | `token_hash` único, `grant_id`, `expires_at`                                                                                                                                      |
| `oauth_refresh_tokens` | `token_hash` único, `grant_id`, `family_id`, `replaced_by`, `revoked_at`, `expires_at`, `created_at`                                                                              |

O Prisma não declara índice único **parcial**; criar o de `oauth_grants` com SQL manual dentro da `migration.sql`. Um grant é a autorização de **uma pessoa a um aplicativo**; é a unidade que a pessoa revoga. Reautorizar o mesmo app **reaproveita o grant ativo** (atualiza escopo) e abre uma família nova de refresh. Revogar o grant revoga todos os tokens dele. Índices nos hashes e em `grant_id`/`user_id`.

### 6.2 Endpoints (todos atrás de `OAUTH_ENABLED`; sem ela respondem `404`)

**Metadata do servidor de autorização** (RFC 8414): `GET /.well-known/oauth-authorization-server` (`@Public()`):

```json
{
  "issuer": "https://trampo-flow.neubergerdev.com.br",
  "authorization_endpoint": "https://trampo-flow.neubergerdev.com.br/oauth/authorize",
  "token_endpoint": "https://trampo-flow.neubergerdev.com.br/api/oauth/token",
  "registration_endpoint": "https://trampo-flow.neubergerdev.com.br/api/oauth/register",
  "revocation_endpoint": "https://trampo-flow.neubergerdev.com.br/api/oauth/revoke",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none"],
  "scopes_supported": [
    "applications:read",
    "applications:write",
    "offline_access"
  ],
  "client_id_metadata_document_supported": true,
  "authorization_response_iss_parameter_supported": true
}
```

O `issuer` **não tem caminho** (raiz do host). Ele tem de ser idêntico ao `iss` usado nas respostas e à URL usada para montar o endereço da metadata, senão o cliente recusa. Derivar de `OAUTH_ISSUER` (padrão: `APP_BASE_URL` sem barra final).

**Registro dinâmico** (RFC 7591): `POST /oauth/register` (`@Public()`, JSON). Entrada: `client_name`, `redirect_uris[]`, `grant_types?`, `response_types?`, `token_endpoint_auth_method?`, `application_type?`, `scope?`. Regras: `redirect_uris` entre 1 e 5, todos passam na política da decisão 7; só `token_endpoint_auth_method: none`; `grant_types` ⊆ `authorization_code`, `refresh_token`; nome ≤ 120 caracteres, sem caracteres de controle. Teto de `OAUTH_MAX_CLIENTS` (padrão 1000) e rate limit por IP. Resposta `201`: `client_id`, `client_id_issued_at`, e o que foi aceito, **sem `client_secret`**. Erros: `invalid_redirect_uri`, `invalid_client_metadata`.

**Consentimento** (`@SessionOnly()`, JWT de sessão):

- `GET /oauth/authorize/preview?response_type=code&client_id=&redirect_uri=&code_challenge=&code_challenge_method=S256&scope=&state=&resource=` valida tudo e devolve `{ client: { name, verified, redirectHost }, scopes: [{ id, label }], cannotDo: ['apagar candidaturas'] }`. Parâmetro inválido devolve `400` com o motivo (a tela mostra o erro e **nunca** redireciona para um `redirect_uri` não validado).
- `POST /oauth/authorize/decision` com os mesmos parâmetros mais `approve: boolean`. Revalida **tudo de novo** (não confiar no `preview`). Aprovar cria/reaproveita o grant, gera o código (32 bytes, hash HMAC, 60 s, uso único) e devolve `{ redirectTo }` = `redirect_uri?code=…&state=…&iss=<issuer>`. Negar devolve `redirect_uri?error=access_denied&state=…&iss=<issuer>`.
- Validações: `client_id` existe (DCR) ou é resolvido por CIMD; `redirect_uri` ∈ URIs do cliente **por igualdade exata** (exceção: loopback ignora a porta, RFC 8252 §7.3); `code_challenge_method` **só** `S256`; `code_challenge` 43 a 128 caracteres base64url; `scope` ⊆ suportados (vazio = `applications:read applications:write`); `resource`, se enviado, igual a `MCP_PUBLIC_URL` canônico (minúsculas, sem barra final, sem fragmento) senão `invalid_target`; ausente = assume o padrão (a spec obriga o cliente a enviar, o servidor tolera).
- "verificado" = `redirect_uri` ∈ callbacks do Claude **ou** `client_id` CIMD com origem `https://claude.ai`/`https://claude.com`. Qualquer outro mostra aviso e o host de destino em destaque.

**Token**: `POST /oauth/token` (`@Public()`, `application/x-www-form-urlencoded`, cabeçalhos `Cache-Control: no-store` e `Pragma: no-cache`):

- `grant_type=authorization_code` com `code`, `redirect_uri`, `client_id`, `code_verifier`, `resource?`. Verificar: código existe, não usado, não expirado, do mesmo `client_id` e `redirect_uri` idêntico ao do `authorize`; PKCE: `base64url(sha256(code_verifier)) === code_challenge` com comparação em tempo constante; marcar como usado **de forma atômica** (`UPDATE … WHERE used_at IS NULL`) para impedir corrida. Se um código **já usado** reaparecer, revogar o grant inteiro. Resposta: `{ "access_token": "tfo_…", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "tfr_…", "scope": "…" }`.
- `grant_type=refresh_token` com `refresh_token`, `client_id`, `scope?` (nunca ampliar). **Rotação**: emitir novo refresh na **mesma resposta** que invalida o antigo; janela de graça de 10 s para retry concorrente; reuso fora da janela revoga a **família** (copiar a lógica de `RefreshSessionUseCase`). Qualquer falha devolve `invalid_grant` (exigência do Claude).
- Erros no formato RFC 6749: `invalid_request`, `invalid_client`, `invalid_grant`, `unauthorized_client`, `unsupported_grant_type`, `invalid_scope`, `invalid_target`.

**Revogação** (RFC 7009): `POST /oauth/revoke` (`@Public()`, form): `token` (+ `token_type_hint`). Revoga o refresh (e o grant) ou o access. Sempre `200`, mesmo para token desconhecido.

**Gestão pelo usuário** (`@SessionOnly()`): `GET /oauth/grants` (app, escopos, desde quando, último uso) e `DELETE /oauth/grants/:id`.

### 6.3 CIMD (Client ID Metadata Documents)

`client_id` em formato de URL `https://…/caminho` (Claude Code usa `https://claude.ai/oauth/claude-code-client-metadata`). O servidor busca o documento e valida:

- Só `https`, **com caminho**; sem seguir redirecionamento; tempo máximo 5 s; corpo ≤ 16 KB; `Content-Type` JSON.
- **Anti-SSRF:** reaproveitar `isPublicAddress` e o DNS guardado de `safe-http-job-page-fetcher.ts` (extrair a parte comum para uma função/classe reutilizável em vez de duplicar).
- `client_id` do documento **idêntico** à URL; `client_name` e `redirect_uris` presentes; `redirect_uris` passam na política da decisão 7 e o `redirect_uri` do pedido consta no documento.
- Cache em memória respeitando `Cache-Control`, com mínimo 5 min e máximo 24 h; falha de rede não é cacheada.
- Persistir o cliente (`source = cimd`) na primeira autorização aprovada, para o grant ter a que se ligar.

### 6.4 Limpeza

`OAuthCleanupService` com `setInterval` de 1 h (`unref()`, limpo em `onModuleDestroy`): apaga códigos expirados há > 1 h, access tokens expirados, refresh expirados ou revogados há > 7 dias e clientes DCR sem grants e com mais de 30 dias. Sem dependência nova (não há `@nestjs/schedule`).

### 6.5 Tarefas

- [ ] Prisma: 5 models, migration, `prisma generate`.
- [ ] Domínio e use cases: `RegisterOAuthClient`, `ResolveOAuthClient` (DCR/CIMD), `PreviewAuthorization`, `DecideAuthorization`, `ExchangeAuthorizationCode`, `RefreshOAuthToken`, `RevokeOAuthToken`, `ListOAuthGrants`, `RevokeOAuthGrant`, `AuthenticateOAuthAccessToken`, `GetAuthorizationServerMetadata`.
- [ ] Repositórios (Prisma + em memória), mappers, gerador de tokens (`tfo_`/`tfr_`/código), política de redirect URI, validador PKCE.
- [ ] Controllers (`oauth.controller.ts`, `oauth-metadata.controller.ts`), filtro de erros RFC 6749, `@fastify/formbody` registrado em `main.ts` **e** no helper de testes de controller, se houver.
- [ ] Rate limit em memória: `oauth:token:ip:<ip>` e `oauth:token:client:<client_id>` (30/min), `oauth:register:ip:<ip>` (5/min).
- [ ] Variáveis lidas via `ConfigService` com os padrões da seção 11; falhar cedo se `OAUTH_ENABLED=true` e o issuer não for `https` (exceto `localhost`).
- **Pronto quando:** testes da seção 10 (backend) passam, o fluxo completo roda num Postgres real e o `scripts/oauth-smoke.mjs` (seção 10) passa contra a API local.

## 7. Fase 2: guard e escopos

Pode ir no mesmo PR da Fase 1 ou logo depois (branch `feat/oauth-guard`). **Esta é a única fase que altera comportamento existente.**

- [ ] `AuthenticatedUser` vira `{ sub, authMethod: 'jwt' } | { sub, authMethod: 'pat', tokenId } | { sub, authMethod: 'oauth', tokenId, grantId, scopes }`.
- [ ] `@RequiredScope('applications:read' | 'applications:write')` (metadata em handler).
- [ ] No `JwtAuthGuard`: bearer `tfo_` autentica pelo hash (`AuthenticateOAuthAccessToken`): token existe, não expirado, grant não revogado, `resource` igual a `MCP_PUBLIC_URL`, usuário existe; atualiza `last_used_at` do grant com o mesmo throttle de 1 min.
- [ ] **Deny-by-default** para `oauth` e `pat`: rota sem `@RequiredScope` (e não `@Public`) devolve `403`. `pat` usa o escopo **gravado no token** (decisão 12); tokens antigos recebem `read` + `write` na migration. `jwt` ignora escopos.
- [ ] Marcar handlers: `ApplicationsController` → `create` (write), `preview` (read), `list`, `board`, `stats`, `findOne` (read), `update`, `place` (write); `remove` continua `@SessionOnly()`. Novo `GET /auth/whoami` (read). Atualizar `test/infrastructure/applications.controller.spec.ts`, que já inspeciona os metadados.
- [ ] Escopo ausente: `403` com `WWW-Authenticate: Bearer error="insufficient_scope", scope="<necessário>", resource_metadata="<URL da PRM>"` (o guard define o header na resposta antes de lançar a exceção).
- [ ] Rate limit de escrita por grant (60/min), como hoje por token PAT.
- [ ] **`tfp_` com escopo (decisão 12):** migration adicionando `scope VARCHAR(100) NOT NULL DEFAULT 'applications:read applications:write'` em `personal_access_tokens` (tokens existentes mantêm leitura e escrita); `PersonalAccessToken` (entidade, mapper, repositório, em memória) passa a ter `scope`; `CreatePersonalAccessTokenDto` ganha `scope` opcional validado (`applications:read` ou `applications:read applications:write`); `AuthenticatePersonalAccessTokenUseCase` devolve os escopos e o guard os usa em `request.user.scopes`; `GET /auth/tokens` e a resposta de criação passam a incluir `scope`. Escrita com token somente leitura ⇒ `403 insufficient_scope`.
- [ ] Testes: token somente leitura lê e não escreve (`create`, `update`, `place` dão 403); padrão continua lendo e escrevendo; migration não altera tokens antigos; `DELETE` segue só com sessão.
- **Pronto quando:** PAT e OAuth **não** alcançam `PATCH /auth/me/theme`, `POST /auth/verification/resend`, `/auth/tokens*`, `/oauth/grants*`, `DELETE /applications/:id`; alcançam as rotas de candidaturas com o escopo certo; o JWT segue igual.

## 8. Fase 3: frontend

Branch sugerida: `feat/oauth-ui`.

- [ ] Rota `/oauth/authorize` em `App.tsx`: **dentro de `ProtectedRoute`, fora de `AppShell`** (tela focada, sem menu). O login já devolve para `location.pathname + search`, e `safeRedirectPath` aceita query; verificar com Google e com e-mail não verificado (`/verificar-email` também preserva `from`).
- [ ] `pages/OAuthAuthorizePage.tsx`: lê a query, chama `preview`; mostra "**{app}** quer acessar sua conta no Trampo Flow", host de destino, selo "verificado" (só Claude) ou aviso, o que poderá (ver, criar, atualizar e mover candidaturas) e o que **não** poderá (apagar). Botões **Autorizar** e **Cancelar**; ao decidir faz `window.location.assign(redirectTo)`. Estados: carregando, pedido inválido (mensagem do `preview`, sem redirecionar), erro de rede.
- [ ] `services/api/oauth.service.ts`, `services/oauth.types.ts`, `hooks/useOAuthGrants.ts`, chaves em `lib/query-keys.ts`.
- [ ] `components/settings/ConnectedAppsSection.tsx` em `SettingsPage` (abaixo dos tokens): lista (app, permissões, desde, último uso) e **Revogar** com `ConfirmDialog`. Estado vazio.
- [ ] Criação do `tfp_`: seletor **Permissões** (Leitura e escrita / Somente leitura) em `PersonalAccessTokensSection.tsx`; a lista de tokens mostra a permissão de cada um. Testes em `SettingsPage.test.tsx`.
- [ ] Painel **Como conectar** em Configurações, com uma aba por forma de conexão (Claude web e celular, Claude Code, Outros clientes, Automação), com os comandos já preenchidos com a URL do MCP e o link para o guia completo (seção 12.1). Substitui o texto avulso da Fase 0.
- [ ] Atualizar o aviso da Fase 0: tirar "em breve" quando `OAUTH_ENABLED` estiver ligado em produção.
- [ ] Testes (Testing Library, padrão de `SettingsPage.test.tsx`): autorizar, negar, parâmetro inválido, usuário não logado, lista e revogação.
- Se o layout mudar, regenerar os baselines visuais: `npm run test:visual:update` em `frontend/` (usa o container Linux do Playwright; sem isso o workflow visual falha).
- **Pronto quando:** testes do frontend, lint, typecheck e `npm run check:bundle` passam.

## 9. Fase 4: servidor MCP (`mcp/`)

Branch sugerida: `feat/oauth-mcp`. Tudo atrás de `OAUTH_ENABLED` no `mcp/` também.

- [ ] Metadata do recurso (RFC 9728): `GET /.well-known/oauth-protected-resource` e `GET /.well-known/oauth-protected-resource/mcp`:

```json
{
  "resource": "https://trampo-flow.neubergerdev.com.br/mcp",
  "authorization_servers": ["https://trampo-flow.neubergerdev.com.br"],
  "scopes_supported": ["applications:read", "applications:write"],
  "bearer_methods_supported": ["header"]
}
```

`resource` tem de ser **idêntico** à URL do MCP, caminho incluso (o Claude confere). Só **um** item em `authorization_servers` (o Claude usa o primeiro).

- [ ] `401` passa a trazer `WWW-Authenticate: Bearer resource_metadata="<URL da PRM>", scope="applications:read applications:write"`; para token inválido/expirado acrescentar `error="invalid_token"` (o Claude renova **reativamente** ao receber 401). Header num `200` é ignorado pelo Claude, então só no `401`.
- [ ] Aceitar bearer `tfo_` além de `tfp_` (hoje `readBearer`/`startsWith('tfp_')` em `http.ts` recusa tudo que não for `tfp_`).
- [ ] `getMe()` → `GET /auth/whoami` (decisão da armadilha 7). Atualizar `mcp/test/http.test.ts` e `mcp/test/helpers.ts`.
- [ ] `toApiError`: `403` com `insufficient_scope` vira mensagem clara na tool ("o token não tem permissão de escrita; reconecte e autorize").
- [ ] Variáveis: `MCP_PUBLIC_URL`, `OAUTH_ISSUER`, `OAUTH_ENABLED`.
- [ ] Testes: `401` com `resource_metadata`, PRM com `resource` exato, `tfo_` aceito, `tfp_` continua aceito, `OAUTH_ENABLED=false` mantém o comportamento atual.
- **Pronto quando:** `npm run lint && npm run typecheck && npx vitest run && npm run build` em `mcp/` passam.

## 10. Fase 5: testes e validação

### Automatizados

- **Backend (Vitest, repositórios em memória):** PKCE (S256 correto e errado; `plain` recusado), código de uso único, expirado, de outro cliente, com `redirect_uri` diferente; reuso de código revoga o grant; `resource` errado (`invalid_target`); escopo não ampliável no refresh; rotação do refresh, graça de 10 s, reuso fora da janela revoga a família; revogação do grant derruba access e refresh; política de redirect (Claude, loopback com qualquer porta, `https://evil.example`, `javascript:`, `//host`); DCR (limites, nome, campos extras tolerados); CIMD (`client_id` ≠ URL, redirect fora do documento, documento enorme, lento, redirecionamento, IP privado); guard (deny-by-default, `insufficient_scope`, PAT sem acesso a tema/reenvio, `DELETE` só com sessão); formato RFC 6749 dos erros; `OAUTH_ENABLED=false` ⇒ `404`.
- **Postgres real** (`describe.skipIf(!TEST_DATABASE_URL)`): fluxo completo `register → authorize → token → chamada → refresh → revoke`, cascade ao apagar o usuário, unicidade do grant ativo.
- **Frontend** e **mcp**: conforme as fases 3 e 4.
- **`scripts/oauth-smoke.mjs` (novo, na raiz):** script Node sem dependências que executa o fluxo inteiro contra uma URL (local ou produção): descobre a metadata a partir do `401` do `/mcp`, registra um cliente por DCR, faz login com `E2E_EMAIL`/`E2E_PASSWORD`, chama `preview` e `decision`, troca o código, chama o `/mcp` (`tools/list`), faz refresh, confere que `DELETE` e `/auth/tokens` dão `403`, revoga e confere o `401`. Documentar o uso no README. É a prova repetível de que o fluxo funciona.

### Receita para rodar localmente (a que já foi usada neste projeto)

```bash
# banco temporário (o nome TEM de terminar em _test para os testes de Postgres)
docker run -d --rm --name tf-test -e POSTGRES_USER=trampo -e POSTGRES_PASSWORD=trampo \
  -e POSTGRES_DB=trampo_flow_test -p 55432:5432 postgres:16-alpine
cd backend
TEST_DATABASE_URL=postgresql://trampo:trampo@127.0.0.1:55432/trampo_flow_test npx vitest run
docker stop tf-test   # sempre remover ao final
```

Para um teste ao vivo (comandos em `backend/`): criar outro banco (`CREATE DATABASE trampo_flow_e2e`), `DATABASE_URL=… npx prisma migrate deploy`, `E2E_EMAIL=e2e@example.com E2E_PASSWORD=E2e-super-secret-123 node scripts/create-e2e-user.mjs`, `npm run build` e `PORT=3999 NODE_ENV=development JWT_SECRET=<≥32 chars> AUTH_TOKEN_SECRET=<≥32 chars> node dist/main.js`. Para a stack inteira: `docker compose -p <nome-isolado> --env-file <arquivo> up -d --build` com `POSTGRES_PORT`, `WEB_PORT` e `MAILPIT_PORT` alternativos, e `docker compose … down -v` no fim (não mexer nos volumes do desenvolvimento).

### Manuais (depois do deploy com a flag ligada)

O Claude exige URL pública e IPv4, então estes testes só valem **em produção**:

- [ ] **MCP Inspector** (`npx @modelcontextprotocol/inspector`), aba de autenticação (fluxo guiado de OAuth que mostra cada passo e onde falha).
- [ ] **Claude Code:** `claude mcp add --transport http trampo-flow https://…/mcp` **sem** cabeçalho; em `/mcp` escolher autenticar; o navegador abre.
- [ ] **claude.ai:** Configurações → Conectores → conector personalizado com a URL. Conferir também o plano necessário.
- [ ] **Celular:** o conector aparece e funciona no app.
- [ ] Revogar em "Aplicativos conectados" e confirmar que o Claude perde acesso.

## 11. Fase 6: infraestrutura

Branch sugerida: `feat/oauth-infra` (pode ir junto da Fase 4).

- [ ] `infra/ingress/nginx.conf`, **antes** de `location /`:
  - `location = /.well-known/oauth-authorization-server` → `proxy_pass http://api:3000/.well-known/oauth-authorization-server;`
  - `location ^~ /.well-known/oauth-protected-resource` → `proxy_pass http://mcp:3100;` (mantendo o caminho)
  - Cabeçalhos CORS abertos (`Access-Control-Allow-Origin: *`, sem credenciais) e resposta a `OPTIONS` nesses dois e em `/api/oauth/token|register|revoke`.
  - Zonas de rate limit novas: `oauth_token_limit` (30 r/min) e `oauth_register_limit` (5 r/min) para `location = /api/oauth/token` e `location = /api/oauth/register`, no padrão de `login_limit`. Os demais usam `api_limit`.
  - Validar com `docker run --rm -v $PWD/infra/ingress/nginx.conf:/etc/nginx/conf.d/default.conf:ro --add-host api:127.0.0.1 --add-host web:127.0.0.1 --add-host mcp:127.0.0.1 nginxinc/nginx-unprivileged:alpine nginx -t`.
- [ ] `docker-compose.yml` e `.env.example` (raiz e `backend/`): `OAUTH_ENABLED` (padrão `false`), `OAUTH_ISSUER` (padrão `APP_BASE_URL`), `MCP_PUBLIC_URL` (padrão `${APP_BASE_URL}/mcp`), `OAUTH_EXTRA_REDIRECT_URIS`, `OAUTH_ACCESS_TOKEN_TTL_SECONDS` (3600), `OAUTH_REFRESH_TOKEN_TTL_DAYS` (30), `OAUTH_CODE_TTL_SECONDS` (60), `OAUTH_MAX_CLIENTS` (1000). Repassar ao `api` e ao `mcp`.
- [ ] **Cloudflare** (conferir no painel, não dá para fazer por código): liberar o egress do Claude `160.79.104.0/21` ou isentar `/.well-known/*`, `/api/oauth/*` e `/mcp` de Bot Fight e rate limit; o registro `A` do host precisa ser público e IPv4 (o conector não usa IPv6); sem redirecionamento apex→`www` ou outro host (derruba o `Authorization`). A causa mais comum de "Couldn't reach" é um WAF.
- **Ordem de deploy:** migration → `api` → `mcp` → recriar o `ingress` (o `nginx.conf` é volume montado) → só então `OAUTH_ENABLED=true`. Diagnóstico: `curl -i https://<host>/.well-known/oauth-protected-resource/mcp`, `curl -i https://<host>/.well-known/oauth-authorization-server` e `curl -i -X POST https://<host>/mcp` (deve dar `401` com `resource_metadata`).

## 12. Fase 7: documentação e release 3.2.0

- [ ] **Guia de uso do OAuth** (partes A1 a A4 da seção 12.1) em `docs/guia-conexao-mcp.md`, testado nos clientes reais.
- [ ] README: seção "Conectar pelo Claude web e celular" (passo a passo, fluxo, segurança, variáveis, `scripts/oauth-smoke.mjs`); atualizar a tabela da seção 2 e "Decisions and known limitations" (sai o aviso de OAuth ausente; entram: tokens opacos, desvio do passthrough, redirect allowlist, rate limit em memória).
- [ ] Registrar as decisões da seção 3 (principalmente a 5) num texto curto no README ou em `docs/`, com o porquê.
- [ ] `frontend/README.md`: nova rota `/oauth/authorize`, serviço, hook e componentes.
- [ ] CHANGELOG `3.2.0`; `npm version 3.2.0 --no-git-tag-version` nos 4 pacotes; commit `chore(release): 3.2.0`; tag anotada `v3.2.0` depois do merge.
- [ ] Marcar este plano como implementado e mover o que sobrar para "Depois".

### 12.1 Guia de uso por forma de conexão (entrega obrigatória)

Arquivo: `docs/guia-conexao-mcp.md`, **em português**, para o dono poder mandar o link a quem for usar. O README (inglês) resume e aponta para ele; a tela de Configurações traz o resumo de cada método (aba "Como conectar", Fase 3). A parte **B** (`tfp_`) é escrita na 3.1.1; a parte **A** (OAuth) na 3.2.0.

**Estrutura de cada método** (usar sempre os mesmos tópicos): 1) para quem é; 2) pré-requisitos; 3) passo a passo numerado, com comandos copiáveis e a URL real `https://trampo-flow.neubergerdev.com.br/mcp`; 4) como confirmar que conectou; 5) três pedidos de exemplo para testar ("cadastra essa vaga: <link>", "o que está parado há mais de 7 dias?", "move a vaga da Haytek para Em andamento, fase Entrevista técnica"); 6) como desconectar ou revogar; 7) erros comuns e solução; 8) cuidados de segurança.

**A. Por OAuth (3.2.0): sem token, o Claude pede a autorização**

- [ ] **A1. Claude web (claude.ai):** Configurações → Conectores → adicionar conector personalizado → informar a URL do MCP → janela do Trampo Flow → login (senha ou Google) → **Autorizar**. Confirmar: o conector aparece como conectado e o Claude lista as ferramentas.
- [ ] **A2. Claude Desktop:** mesmo caminho, pela tela de Conectores do aplicativo (**não** pelo `claude_desktop_config.json`, que só aceita servidores locais).
- [ ] **A3. Claude no celular:** adicionar o conector no claude.ai e usar no app. **Validar na prática** antes de afirmar; se não for assim, documentar o que for.
- [ ] **A4. Claude Code (terminal):** `claude mcp add --transport http trampo-flow https://…/mcp` **sem** cabeçalho; em `/mcp` escolher autenticar; o navegador abre; autorizar. Opção `-s user` para valer em todos os projetos.
- [ ] **Desconectar:** Configurações → **Aplicativos conectados** → Revogar (e remover o conector no próprio Claude).
- [ ] **Erros comuns:** "Couldn't reach" (WAF/Cloudflare ou DNS), "Authorization with the MCP server failed" (redirecionamento para outro host), plano do Claude sem conectores personalizados, `redirect_uri` não permitido (cliente fora da allowlist), sessão expirada no meio, conta Google sem e-mail verificado.
- [ ] **Segurança:** o que o aplicativo pode (ver, criar, atualizar e mover) e o que não pode (apagar); conferir o nome e o host de destino na tela de permissão; nada para copiar nem guardar.

**B. Por token `tfp_` (3.1.1): token criado em Configurações e enviado no cabeçalho**

- [ ] **B1. Claude Code (terminal):** criar o token (nome, validade e, depois da 3.2.0, permissão) → `claude mcp add --transport http trampo-flow https://…/mcp -s user --header "Authorization: Bearer tfp_…"` → `/mcp` mostra `trampo-flow` conectado. Remover: `claude mcp remove trampo-flow`.
- [ ] **B2. Cursor, VS Code e outros que aceitam cabeçalho:** URL do MCP, transporte Streamable HTTP e cabeçalho `Authorization: Bearer tfp_…`. **O formato exato do JSON de cada cliente deve ser conferido na documentação dele no momento de escrever**; não copiar de memória. Marcar no guia o que foi testado e o que não foi.
- [ ] **B3. Claude Desktop:** duas saídas, ambas marcadas com o que foi testado: (a) modo local stdio (`mcp/dist/index.js`, com `TRAMPO_API_URL` e `TRAMPO_API_TOKEN` no `env` do `claude_desktop_config.json`; exige clonar o repositório e rodar o build); (b) ponte `mcp-remote` apontando para a URL com `--header` (**não testada até aqui**: testar antes de documentar como funcionando). Depois da 3.2.0, apontar para o método A2.
- [ ] **B4. Automação e scripts (sem navegador):** um token **por automação**, com nome claro e validade curta (30 a 90 dias); **somente leitura** quando só consulta (depois da 3.2.0); guardar em gerenciador de segredos ou variável de ambiente, nunca no repositório. Dois exemplos testados e copiáveis: (1) cliente MCP em Node (SDK `StreamableHTTPClientTransport` com `requestInit.headers`) chamando `pipeline_summary`; (2) `curl` na API REST (`GET /api/applications/stats`). Informar os limites: 60 escritas por minuto por token, nada apaga, e que o token vence. Explicar por que **não** usar OAuth aqui (decisão 11).
- [ ] **B5. Desenvolvimento local (stdio):** `cd mcp && npm ci && npm run build` e `claude mcp add trampo-flow -e TRAMPO_API_URL=http://localhost:5173/api -e TRAMPO_API_TOKEN=tfp_… -- node …/mcp/dist/index.js`; como usar o MCP Inspector (`npx @modelcontextprotocol/inspector -e … node dist/index.js`) e a diferença entre o token do Inspector (`MCP_PROXY_AUTH_TOKEN`) e o `tfp_`.
- [ ] **Revogar:** Configurações → Tokens de integração → Revogar (efeito imediato).
- [ ] **Erros comuns:** `401` "token inválido, expirado ou revogado" (criar outro), `403` (token somente leitura tentando escrever, ou rota que exige login), `429` (limite de escritas), cabeçalho sem o prefixo `Bearer`, token colado com espaço ou quebra de linha, URL sem `/mcp`.
- [ ] **Segurança:** o token vale como senha da conta (menos apagar); não colar em chat nem em repositório; revogar se vazar.

**Comparativo no início do guia** (o que o leitor vê primeiro): qual forma usar para cada situação: "uso o Claude no navegador ou no celular" → A1/A3; "uso o Claude Code" → A4 (ou B1 se quiser sem navegador); "script, cron ou CI" → B4; "Cursor ou VS Code" → B2; "só quero testar localmente" → B5.

**Pronto quando:** cada passo foi executado por quem escreveu (ou está explicitamente marcado "não testado"); os comandos são copiáveis sem edição além do token; outra pessoa conseguiu conectar seguindo o guia do zero; o README e a tela de Configurações apontam para o guia.

## 13. Checklist de segurança (conferir antes de ligar a flag)

- [ ] PKCE S256 obrigatório; `plain` e ausência de `code_challenge` recusados.
- [ ] Código de uso único, 60 s; reuso revoga o grant; troca atômica.
- [ ] `redirect_uri` por igualdade exata (loopback ignora só a porta); nunca redirecionar para URI não validada.
- [ ] Tokens, códigos e refresh só como HMAC no banco; nunca em log nem em mensagem de erro.
- [ ] Refresh rotativo com detecção de reuso; `invalid_grant` em qualquer falha.
- [ ] Audiência (`resource`) conferida na API; escopo mínimo; nenhum escopo apaga.
- [ ] `tfp_` somente leitura nunca escreve; migration não amplia nem reduz os tokens antigos.
- [ ] Deny-by-default para `pat` e `oauth`; `DELETE`, `/auth/tokens*` e `/oauth/grants*` só com sessão.
- [ ] CIMD sem SSRF (IP público, sem redirecionamento, tamanho e tempo limitados).
- [ ] DCR: só clientes públicos, allowlist de redirect, teto de clientes, rate limit.
- [ ] Tela de consentimento mostra nome e host de destino; selo "verificado" só para Claude.
- [ ] Sem `client_secret` emitido; sem token em query string.
- [ ] `OAUTH_ENABLED=false` não expõe nenhuma rota nova.

## 14. Pontos em aberto (dependem do dono do projeto)

1. Confirmar as recomendações da decisão 10 (1 h / 30 dias) e da entrega escura (decisão 9) se houver dúvida.
2. Quais clientes além do Claude entram em `OAUTH_EXTRA_REDIRECT_URIS` (Cursor, VS Code, ChatGPT), conforme demanda.
3. Se o GIF/demo do README deve mostrar o fluxo OAuth no Claude web (gravação é manual).
4. Quem testa e valida cada método do guia (seção 12.1) em clientes reais, incluindo Cursor/VS Code e a ponte `mcp-remote`.
5. Quem faz os testes manuais em produção (seção 10): exigem conta Claude com conectores personalizados.

## 15. Riscos

- **Cloudflare/WAF** bloqueando o IP do Claude: só se confirma em produção.
- **Revisão 2026-07-28 da spec do MCP** remove sessões e `initialize` e adiciona `server/discover`. Nosso transporte é sem estado, mas o SDK em uso (1.32.2) pode não falar o protocolo novo; se o Claude já usar a revisão nova, **atualizar o SDK** e revalidar os testes de `mcp/`. Conferir na validação manual.
- **DCR aberto** a clientes enganosos: mitigado por allowlist, selo "verificado", host na tela, rate limit e teto de clientes.
- **Rate limit em memória** não é compartilhado entre réplicas (igual ao resto do projeto).
- **Desvio da regra de passthrough** (decisão 5): aceitável porque API e MCP são o mesmo domínio de confiança e a API valida audiência e escopo; precisa estar documentado.

## 16. Como trabalhar (convenções do repositório)

- **Um PR por fase**, branch a partir de `main`. Os PRs são **squash-merge**: se uma branch empilhada ficar para trás, use `git rebase --onto main <ultimo-commit-antigo-da-base> <sua-branch>` em vez de `git rebase main` (o rebase simples reaplica os commits já incorporados e dá conflito).
- **Commits em inglês, Conventional Commits, assunto em minúsculas** (o `commitlint` recusa `subject-case` sentence/upper-case): `feat(oauth): …`, `fix(auth): …`, `docs: …`, `chore(release): x.y.z`. O hook `pre-commit` roda `lint-staged` (ESLint + Prettier). Siga as linhas de atribuição que o ambiente indicar nos commits e nos PRs.
- **Antes de abrir PR**, em cada pacote tocado: `npm run lint`, `npm run typecheck` (no backend `npm run test:typecheck`), testes e `npm run build`; na raiz `npm run format:check`. CI roda backend, frontend, mcp, tooling e a build das imagens Docker (`mcp` incluído).
- **Backend**: não importar Prisma/Nest em `domain`; repositório abstrato em `domain`, implementação Prisma em `infrastructure/database/prisma`, versão em memória em `backend/test/repositories/`.
- **Teste visual** (`frontend/e2e`) só roda manualmente (workflow `visual.yml`); baselines desatualizados já causaram uma falha silenciosa na 3.1.0, então regenere-os se a interface mudar.
- Um teste do frontend falhou **uma única vez** numa rodada completa e não se repetiu em 7 execuções (não identificado). Se aparecer, rode de novo antes de investigar.
- Neste ambiente de desenvolvimento o HTTPS para `github.com` chegou a expirar (o `gh` falha) enquanto o push por SSH funciona; se acontecer, abra o PR pelo link que o `git push` imprime.
- Não fazer merge nem tag sem o dono pedir: o merge na `main` dispara a publicação das imagens no GHCR.

## 17. Fora do escopo

- Escopo para exclusão ou para gestão de tokens via OAuth.
- IdP externo (Auth0, Keycloak) e cliente confidencial (`client_secret`).
- Escopos mais finos que leitura e escrita; escopos por recurso.
- Rate limit compartilhado entre réplicas (exigiria Redis ou Postgres).

## 18. Referências (conferidas em 2026-11-15)

- [MCP, autorização (rev. 2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) e [2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).
- [Claude, autenticação de conectores](https://claude.com/docs/connectors/building/authentication) e a página de troubleshooting.
- RFCs: 9728 (Protected Resource Metadata), 8414 (AS Metadata), 7591 (DCR), 7636 (PKCE), 8707 (Resource Indicators), 9207 (`iss`), 7009 (revogação), 8252 (redirect loopback), 6749 e 6750; rascunho de Client ID Metadata Documents.

O que o cliente do Claude exige, segundo a doc dele: descobre tudo a partir de um `401` com `WWW-Authenticate: Bearer resource_metadata="…"`; usa CIMD ou DCR; PKCE S256 sempre; envia `resource` com a URL canônica do MCP; `redirect_uri` do claude.ai, Desktop e celular `https://claude.ai/api/mcp/auth_callback`, e do Claude Code loopback `http://localhost:<porta>/callback`; `/token` em form-urlencoded e `/register` em JSON; respostas em até 10 s (30 s no refresh); refresh falho deve devolver `invalid_grant`; refresh de cliente público rotaciona; renova o token ao receber `401` e até 5 min antes de expirar; egress `160.79.104.0/21`, só IPv4.
