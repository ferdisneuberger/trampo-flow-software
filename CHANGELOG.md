# Changelog

Todas as mudanças relevantes do projeto. O formato segue Conventional Commits e o
versionamento semântico.

## 2.0.4 — 2026-11-06

### Adicionado

- Cadastro público com verificação de email, tokens com hash, limites de reenvio e
  emails transacionais via SMTP (Mailpit no desenvolvimento).
- Recuperação de senha com tokens de uso único, expiração padrão de 15 minutos e
  revogação de todas as sessões após a troca.
- Login com Google, com verificação do ID token, criação de conta já verificada e
  vinculação apenas a emails verificados.
- Endpoint administrativo `DELETE /admin/users/:email`, protegido por `x-api-key` e
  limites de taxa, com cascata de dados e scripts de backup/restauração do dono.
- Nome e sobrenome no cadastro e nas respostas de autenticação.
- Workflow de publicação das imagens de backend e frontend no GHCR a cada push em
  `main`.

### Alterado

- Login passa a usar email como identidade; o username fica opcional e o bootstrap de
  usuário por variáveis de ambiente foi removido.
- Política de senha passa a exigir no mínimo 8 caracteres, com feedback em tempo real e
  alternância de visibilidade.
- Links de redefinição de senha expiram em 15 minutos; o TTL de verificação de email e a
  janela de rate limit do login foram reduzidos.
- Usuários sem email verificado podem entrar, mas são direcionados à verificação e não
  podem criar candidaturas até confirmar a conta.
- Workspace passa a ser somente o quadro: dashboard, visão em lista e página de conta
  foram removidos.
- Quadro mantém as quatro colunas na horizontal em qualquer viewport, com rolagem
  interna, e o detalhe da candidatura foi reorganizado.
- Sessão e invalidação de cache foram consolidadas; upload e download de arquivos saíram
  da interface.
- Dockerfile da API passou a multi-stage, reduzindo a imagem de 1,27 GB para 818 MB.
- Logs de SMTP mostram configuração mascarada e falhas de entrega com código e comando.
- `backend/.env.example` alinhado aos defaults do Compose para JWT, refresh token,
  janela de login e TTL de verificação de email.

### Corrigido

- Falhas de envio de email agora ficam registradas com contexto suficiente para
  diagnóstico.
- Cliques gerados pelo fim de um arraste não abrem mais o cartão por engano.
- Criação de candidatura por usuário sem email verificado é bloqueada no cliente e na
  API.

### Removido

- Dashboard, listagem em tabela e página de conta.
- Upload e download de arquivos pela interface.
- Bootstrap de usuário por variáveis de ambiente.

## 2.0.3 — 2026-11-02

### Alterado

- Cliente de storage migrado para o AWS SDK v3.
- Overrides para `deepmerge-ts`, `glob` e `minimatch`.
- Pipeline de e2e desabilitado até a revisão da versão.

### Corrigido

- Vulnerabilidades zeradas nos três pacotes.

## 2.0.2 — 2026-11-02

### Adicionado

- Verificação de e2e local no pre-push, com escape via `SKIP_E2E`.
- Workflow de e2e com filtro de paths e cache de browser.

### Alterado

- Fluxo de ponta a ponta passa a cobrir o reload da sessão.

## 2.0.1 — 2026-11-02

### Corrigido

- Logout ao atualizar a página: o access token renovado passa a ser guardado antes de
  buscar o perfil.

## 2.0.0 — 2026-11-02

### Adicionado

- Candidaturas passam a pertencer a um usuário (`user_id`), com filtro por dono em todas
  as consultas e 404 para registros de outra conta.
- Campos `company` e `companyUrl`, com validação no domínio.
- Quadro kanban com colunas por status, arrastar e soltar e reordenação manual via
  `PATCH /applications/:id/placement`.
- Posição persistida em múltiplos de 1000, com reindexação automática quando o intervalo
  entre vizinhos acaba.
- Busca por título, empresa e fase, com filtro por status e paginação por cursor em
  `GET /applications`.
- `GET /applications/stats` com contadores por status.
- `GET /applications/board` com as colunas ordenadas por posição.
- `GET /applications/:id` para a tela de detalhe.
- Upload real de arquivos em storage compatível com S3 (MinIO no Compose), limitado a
  PDF e TXT, 5 MB por arquivo e 3 por candidatura. Validação por extensão e magic bytes.
- Download autenticado e remoção de arquivo.
- Refresh token em cookie `HttpOnly`, com rotação por família, detecção de reuso e janela
  de tolerância para múltiplas abas.
- `POST /auth/refresh` e `POST /auth/logout`.
- Painel com contadores e candidaturas paradas há mais tempo.
- Página de conta.
- Testes de componente com Testing Library e fluxo de ponta a ponta com Playwright.

### Alterado

- Access token passa a viver em memória, com validade padrão de 5 minutos e renovação
  automática no cliente.
- `GET /applications` devolve `{ items, nextCursor, hasMore }` em vez de um array.
- `sub` do JWT passa a ser o id do usuário, não o username.
- Navegação migrou do header para uma sidebar, com layout desktop-first.
- Superfícies usam borda em vez de sombra; raio de cartão padronizado em 12px.
- Formulário de candidatura não gerencia mais anexos; upload acontece na tela de detalhe.
- Arquivos antigos, que eram URLs, continuam disponíveis como link externo.

### Corrigido

- Candidaturas novas nasciam com `position` zero e empatavam na ordenação do quadro.
- A janela de tolerância do refresh aceitava tokens revogados por detecção de reuso.
- `UserBootstrapService` criava o primeiro usuário sem verificar a política de senha.

### Removido

- `ApplicationsContext` e o hook manual de carregamento, substituídos por TanStack Query.
- Componentes de lista em cartões e o uploader baseado em metadados.
- `token-storage` (localStorage).
