# Plano: servidor MCP do Trampo Flow

## Objetivo

Permitir que um agente de IA (Claude Code, Claude Desktop ou qualquer cliente MCP) consulte e atualize as candidaturas do Trampo Flow. Exemplo de uso: "cadastra essa vaga: <link>", "o que está parado há mais de 7 dias?", "move a vaga da Haytek para Em andamento, fase Entrevista técnica".

## Decisões de arquitetura

1. **O MCP chama a API HTTP, não o banco.** Ele é um cliente da API como o frontend. Assim reaproveita validação (class-validator), autorização por usuário, rate limit e o `preview` de vagas, sem duplicar regra de negócio. É o mesmo padrão de "plugin da IA integrado a um sistema existente".
2. **Pacote novo no monorepo:** `mcp/`, em TypeScript, com `@modelcontextprotocol/sdk` e `zod`. Transporte **stdio** na v1, que é o que Claude Code e Claude Desktop usam localmente. Transporte HTTP remoto fica para depois.
3. **Autenticação por token de acesso pessoal (PAT).** Hoje o access token dura 5 min e o refresh fica num cookie HttpOnly, o que não serve para um processo MCP. Criar tokens próprios para integrações: longos, revogáveis, guardados só como hash e enviados como `Authorization: Bearer tfp_...`. Funciona também para quem entra com Google, que não tem senha.
4. **Sem exclusão pelo agente.** Nenhuma ferramenta apaga candidatura. O agente cria, lê, atualiza e move. Apagar continua sendo ação humana na interface.
5. **Ferramentas anotadas.** `readOnlyHint` nas de leitura e `idempotentHint` onde couber, para o cliente saber o que pede confirmação.

## Fase 1: tokens de acesso pessoal (backend)

- [ ] Prisma: model `PersonalAccessToken` (`id`, `userId`, `name`, `tokenHash`, `prefix` com os primeiros 8 caracteres para exibição, `lastUsedAt`, `expiresAt`, `revokedAt`, `createdAt`), com índice em `tokenHash` e cascade ao apagar o usuário. Gerar a migration.
- [ ] Geração: `tfp_` + 32 bytes aleatórios em base64url. Hash com o `HmacTokenHasher` que já existe (`AUTH_TOKEN_SECRET`). O token em texto aparece **uma vez**, na criação.
- [ ] Domínio/aplicação: repositório + use cases `CreatePersonalAccessToken`, `ListPersonalAccessTokens`, `RevokePersonalAccessToken` e `AuthenticatePersonalAccessToken`.
- [ ] Rotas: `POST /auth/tokens` (`{ name, expiresInDays? }`, máximo de 365 dias), `GET /auth/tokens` (sem o segredo) e `DELETE /auth/tokens/:id`. Criar e revogar **só com o JWT de sessão**: um PAT não pode criar outro PAT.
- [ ] `JwtAuthGuard`: se o bearer começa com `tfp_`, validar pelo hash (não revogado, não expirado), atualizar `lastUsedAt` no máximo uma vez por minuto. Senão, segue o fluxo JWT atual. Em ambos os casos `request.user` passa a ser `{ sub, authMethod: 'jwt' | 'pat', tokenId? }` (o `JwtPayload` completo não existe para PAT).
- [ ] Decorator `@SessionOnly()`: o guard recusa com 403 quando `authMethod === 'pat'`. Usado em `/auth/tokens*`.
- [ ] Rate limit por token nas rotas de escrita, reaproveitando o `RateLimiterService`.
- [ ] Testes (Vitest): criação devolve o segredo uma vez; o hash bate; token revogado ou expirado dá 401; PAT não acessa `/auth/tokens`; token de outro usuário não enxerga candidaturas (404).
- [ ] Swagger: documentar o esquema `tfp_`.
- [ ] Rotas de token passam pelo `location /api` genérico do ingress; o rate limit fica no próprio backend (criação: 10 por hora por usuário).
- [ ] Tela em Configurações → "Tokens de integração" (rota `/settings`, link no menu da conta): criar com nome e validade, mostrar o segredo uma vez com botão de copiar, listar (nome, prefixo, último uso, expiração) e revogar.

## Fase 2: pacote `mcp/`

Estrutura:

```
mcp/
  package.json        # bin: trampo-flow-mcp
  tsconfig.json
  src/
    index.ts          # cria o McpServer, registra as tools, conecta StdioServerTransport
    config.ts         # lê TRAMPO_API_URL e TRAMPO_API_TOKEN (valida com zod e falha cedo)
    api-client.ts     # fetch com Bearer, timeout, mapeamento de erros
    tools/*.ts        # uma tool por arquivo
  test/*.test.ts
```

- [ ] `api-client.ts`: transforma erros HTTP em mensagens úteis para o modelo. 401 vira "token inválido ou revogado; gere outro em ...", 404 vira "candidatura não encontrada", 429 vira "muitas requisições, tente em 1 min", e 400 traz a mensagem de validação da API. Nunca registrar o token em log.
- [ ] **stdout é do protocolo**: log só em `stderr`.

Ferramentas (nomes em inglês e descrições em português, para o modelo escolher bem):

| Tool                                                                                   | API                                                                       | Observação                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preview_job_posting(link)`                                                            | `POST /applications/preview`                                              | Só leitura. Devolve título, empresa e site lidos da página.                                                                                                                                                                                                                                                      |
| `create_application(link, currentPhase?, title?, company?, companyUrl?, status?)`      | `GET /applications?search=` + `preview` + `POST /applications`            | Antes de criar, procura candidatura com o mesmo link (evita duplicar quando o agente repete a chamada) e devolve a existente. Preenche o que faltar com o preview. Se título ou empresa continuarem vazios, devolve erro pedindo esses campos, em vez de inventar. `currentPhase` padrão: "Candidatura enviada". |
| `list_applications(status?, search?, limit?)`                                          | `GET /applications`                                                       | Só leitura. Resposta enxuta: id, título, empresa, status, fase e dias desde a última atualização.                                                                                                                                                                                                                |
| `get_application(id)`                                                                  | `GET /applications/:id`                                                   | Só leitura.                                                                                                                                                                                                                                                                                                      |
| `update_application(id, currentPhase?, status?, title?, company?, link?, companyUrl?)` | `PATCH /applications/:id`                                                 | Exige pelo menos um campo.                                                                                                                                                                                                                                                                                       |
| `move_application(id, status)`                                                         | `GET /applications?status=&limit=1` + `PATCH /applications/:id/placement` | Sem vizinhos a API põe o card no **fim** da coluna (`findMaxPosition + GAP`). Para ir ao topo, a tool busca o primeiro card da coluna (o board ordena por posição) e envia `afterId`.                                                                                                                            |
| `pipeline_summary(staleDays = 7)`                                                      | `GET /applications/stats` + `GET /applications?sort=stale&limit=100`      | Só leitura. Totais por status e candidaturas em Aguardando/Em andamento paradas há mais de `staleDays` dias. Não usa `/board`, que corta por coluna.                                                                                                                                                             |

- [ ] Mapear status para os nomes da interface (`frontend/src/services/applications.types.ts`): `PENDING` = Aguardando, `IN_PROGRESS` = Em andamento, `COMPLETED` = Finalizada, `REJECTED` = Recusada. A tool aceita o enum ou o nome.
- [ ] (Opcional) Um prompt MCP `revisar_funil`, que chama `pipeline_summary` e sugere próximos passos.

## Fase 3: testes

- [ ] Unitários (Vitest) com `fetch` mockado: cada tool chama a rota certa com o payload certo; o `create_application` usa o preview e não inventa dados; os erros são mapeados.
- [ ] Teste de integração com `Client` + `InMemoryTransport` do SDK: listar as tools e chamar uma.
- [ ] Manual com o MCP Inspector: `npx @modelcontextprotocol/inspector node mcp/dist/index.js`.
- [ ] Ponta a ponta: subir o `docker-compose` local, criar um PAT, plugar no Claude Code e rodar os três exemplos do objetivo.

## Fase 4: uso e documentação

- [ ] Claude Code:
  ```
  claude mcp add trampo-flow \
    -e TRAMPO_API_URL=https://trampo-flow.neubergerdev.com.br/api \
    -e TRAMPO_API_TOKEN=tfp_... \
    -- node /caminho/trampo-flow-software/mcp/dist/index.js
  ```
- [ ] Claude Desktop: o mesmo bloco em `claude_desktop_config.json`.
- [ ] README: seção "Usando com agentes de IA (MCP)", com setup, lista de tools, decisões de segurança (PAT com hash, sem delete, escopo por usuário) e um GIF curto de uso.
- [ ] Monorepo: `mcp/` com lockfile próprio, entrada no `lint-staged` e no script `lint` da raiz.
- [ ] CI: job de lint, typecheck, teste e build para `mcp/` no `ci.yml`.
- [ ] Release **3.1.0** (a 3.0.0 já está tagueada): CHANGELOG reúne o "Since 3.0 (unreleased)" do README (Grafite, sidebar, prefill pelo link) com PAT, tela de tokens e MCP; bump de versão em `package.json` da raiz, backend, frontend e mcp; README com "Highlights of 3.1".
- [ ] GIF de uso: gravado manualmente; o README deixa o lugar reservado.

## Como executar com Claude Code

Uma fase por sessão. Para cada fase: peça ao agente para ler este arquivo e implementar só aquela fase, revise o diff, rode os testes e abra um PR. Os PRs pequenos, com descrição e testes, são a evidência de "desenvolver com agentes de IA: especificar, revisar, testar e entregar".

## Depois da v1 (fora do escopo)

- Transporte Streamable HTTP em `/mcp` no próprio backend, com OAuth, para usar no Claude web e no celular.
- Escopos no PAT (`read`, `write`).
