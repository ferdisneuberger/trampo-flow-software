# Política de segurança

## Versões suportadas

Apenas a branch `main` recebe correções. Não há releases versionadas até o momento.

## Como reportar uma vulnerabilidade

**Não abra issue pública.** Use a aba **Security** do repositório e selecione
**Report a vulnerability**, que abre um aviso privado visível apenas para os
mantenedores.

Inclua, se possível:

- versão ou commit afetado;
- passos para reproduzir;
- impacto esperado (vazamento de dados, bypass de autenticação, etc.);
- sugestão de correção, se houver.

Retorno inicial em até 7 dias. Se o relato for aceito, a correção é publicada em
`main` e o aviso é divulgado depois do deploy.

## Escopo

Fazem parte do escopo:

- autenticação, emissão e validação do JWT (`/auth/*`);
- autorização das rotas de `/applications`;
- exposição de dados pela API;
- configuração de CORS, cabeçalhos de segurança e proxy do ingress;
- injeção de SQL, XSS e CSRF na aplicação web;
- segredos versionados por engano.

Fora do escopo:

- engenharia social e phishing;
- negação de serviço e flood;
- relatos gerados apenas por scanner, sem prova de impacto;
- vulnerabilidades em dependências sem CVE aplicável ao uso do projeto;
- más práticas já documentadas em "Decisões e limitações conhecidas" no README
  (sessão no `localStorage`, rate limit em memória, ausência de paginação).

## Práticas adotadas

- Senha comparada em tempo constante, com limite de tentativas por janela.
- JWT assinado com HMAC-SHA256, `iss`/`aud` validados e TTL máximo de 30 dias.
- `ValidationPipe` com `whitelist` e `forbidNonWhitelisted`.
- Cabeçalhos de segurança aplicados na API; CSP restritiva fora de `/docs`.
- Portas de banco e Adminer publicadas apenas em `127.0.0.1`.
- Dependabot e secret scanning habilitados no repositório.
