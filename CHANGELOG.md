# Changelog

Todas as mudanças relevantes do projeto. O formato segue Conventional Commits e o
versionamento semântico.

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
