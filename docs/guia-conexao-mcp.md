# Guia: conectar um agente de IA ao Trampo Flow (MCP)

O Trampo Flow tem um servidor [MCP](https://modelcontextprotocol.io) em `https://trampo-flow.neubergerdev.com.br/mcp`. Com ele, um agente de IA consulta e atualiza as **suas** candidaturas: cadastrar uma vaga a partir do link, ver o que está parado, mover no quadro e mudar a fase.

O agente **não apaga** candidaturas (apagar é só pela interface) e só enxerga a sua conta.

## Qual forma de conexão usar

| Eu quero…                                               | Use                                   |
| ------------------------------------------------------- | ------------------------------------- |
| Usar no **Claude Code** (terminal)                      | [B1](#b1-claude-code-terminal)        |
| Usar no **Cursor** ou no **VS Code**                    | [B2](#b2-cursor-vs-code-e-similares)  |
| Usar no **Claude Desktop**                              | [B3](#b3-claude-desktop)              |
| Rodar um **script, cron ou CI**                         | [B4](#b4-automação-e-scripts)         |
| **Testar localmente** ou desenvolver                    | [B5](#b5-desenvolvimento-local-stdio) |
| Usar no **Claude web ou no celular** (login, sem token) | Parte A (OAuth): **em breve**         |

> **Estado:** hoje a conexão é por **token** (`tfp_…`, parte B). O login por OAuth, que funciona no Claude web, no celular e no Desktop sem copiar token, chega com a 3.2.0; a parte A deste guia será publicada junto.

### O que está testado

| Método                                | Situação                                                                                                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 Claude Code                        | Endereço e cabeçalho testados ao vivo; a sintaxe do comando conferida na ajuda do CLI (`claude mcp add --help`). O comando em si não foi executado em uma instalação real. |
| B2 Cursor e VS Code                   | Formato conferido na documentação de cada um (consulta em 2026-11-15). **Não testado nos aplicativos.**                                                                    |
| B3 Claude Desktop, modo local (stdio) | Testado.                                                                                                                                                                   |
| B3 Claude Desktop, ponte `mcp-remote` | **Não testada.**                                                                                                                                                           |
| B4 Automação (script Node, `curl`)    | Testado ao vivo, incluindo os erros descritos.                                                                                                                             |
| B5 Desenvolvimento local              | Testado (stdio e MCP Inspector).                                                                                                                                           |

---

## Criar e revogar o token (vale para toda a parte B)

1. Entre no Trampo Flow, abra o menu da conta e vá em **Configurações → Tokens de integração**.
2. Informe um **nome** que diga onde o token será usado (ex.: "Claude Code no notebook") e a **validade**.
3. Clique em **Criar token** e **copie na hora**: ele aparece uma única vez. O sistema guarda só um resumo (hash), então não dá para recuperá-lo depois. Se perder, revogue e crie outro.
4. Para desligar um acesso, volte à mesma tela e clique em **Revogar**. O efeito é imediato.

Regras do token: vale até 365 dias (padrão 90), no máximo 20 ativos por conta, até 60 escritas por minuto por token e **nunca apaga** candidaturas. Trate-o como uma senha: não cole em chats, repositórios nem prints.

**Permissões.** Ao criar, escolha **Leitura e escrita** (padrão) ou **Somente leitura**. Um token somente leitura consulta tudo (listar, ver, resumo do funil), mas qualquer tentativa de criar, atualizar ou mover recebe `403`. Prefira-o para relatórios e automações que só consultam. Não é possível mudar a permissão depois: crie outro token.

### Três pedidos para testar qualquer conexão

1. "Cadastra essa vaga: `<link de uma vaga>`"
2. "O que está parado há mais de 7 dias?"
3. "Move a vaga da `<empresa>` para Em andamento e muda a fase para Entrevista técnica"

---

## B1. Claude Code (terminal)

**Para quem é:** quem usa o Claude Code. **Pré-requisitos:** Claude Code instalado e um token `tfp_…`.

1. Rode (troque `tfp_…` pelo seu token):

   ```bash
   claude mcp add --transport http trampo-flow \
     https://trampo-flow.neubergerdev.com.br/mcp \
     --scope user \
     --header "Authorization: Bearer tfp_…"
   ```

   `--scope user` deixa o servidor disponível em qualquer pasta. Sem ele, vale só para o projeto atual.

2. **Confirme:** dentro do Claude Code, digite `/mcp`. O `trampo-flow` deve aparecer como conectado, com 7 ferramentas.
3. Faça os três pedidos de teste acima.
4. **Remover:** `claude mcp remove trampo-flow` e revogue o token em Configurações.

**Problemas comuns**

- `/mcp` mostra falha de autenticação: o token está errado, expirou ou foi revogado. Crie outro e refaça o `claude mcp add` (remova o anterior antes).
- O token foi colado com espaço ou quebra de linha no meio. Cole de novo em uma linha só.
- A URL precisa terminar em `/mcp`.

## B2. Cursor, VS Code e similares

**Para quem é:** quem usa clientes que aceitam um servidor MCP remoto com cabeçalho. Os formatos abaixo seguem a documentação oficial consultada em 2026-11-15; **confira a página do seu cliente**, porque eles mudam.

**Cursor** (`~/.cursor/mcp.json` para todos os projetos, ou `.cursor/mcp.json` no projeto). Guarde o token numa variável de ambiente do sistema (`TRAMPO_API_TOKEN`) e referencie assim:

```json
{
  "mcpServers": {
    "trampo-flow": {
      "url": "https://trampo-flow.neubergerdev.com.br/mcp",
      "headers": {
        "Authorization": "Bearer ${env:TRAMPO_API_TOKEN}"
      }
    }
  }
}
```

**VS Code** tem dois formatos. A documentação atual recomenda o formato nativo do Copilot: arquivo `.mcp.json` na raiz do projeto, ou `~/.copilot/mcp-config.json`, com o token numa variável de ambiente:

```json
{
  "mcpServers": {
    "trampo-flow": {
      "type": "http",
      "url": "https://trampo-flow.neubergerdev.com.br/mcp",
      "headers": {
        "Authorization": "Bearer ${TRAMPO_API_TOKEN}"
      },
      "tools": ["*"]
    }
  }
}
```

O formato antigo, `.vscode/mcp.json` (raiz `servers`), permite pedir o token ao abrir, sem deixá-lo no arquivo:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "trampo-token",
      "description": "Token de integração do Trampo Flow",
      "password": true
    }
  ],
  "servers": {
    "trampo-flow": {
      "type": "http",
      "url": "https://trampo-flow.neubergerdev.com.br/mcp",
      "headers": { "Authorization": "Bearer ${input:trampo-token}" }
    }
  }
}
```

**Nunca escreva o token literal em um arquivo que vá para o Git.** **Confirme:** o cliente lista o servidor `trampo-flow` e as 7 ferramentas; faça os pedidos de teste. **Problemas comuns:** variável de ambiente não definida na sessão em que o aplicativo foi aberto (reabra o app depois de definir); falta de `Bearer ` antes do token.

## B3. Claude Desktop

O arquivo de configuração do Claude Desktop (`claude_desktop_config.json`) **só aceita servidores locais** (que ele inicia com um comando). Ele não aceita uma URL com cabeçalho. Há duas saídas:

**(a) Modo local (stdio), testado.** Exige o repositório e o Node instalados.

1. Clone o repositório e gere o build:

   ```bash
   git clone https://github.com/ferdisneuberger/trampo-flow-software.git
   cd trampo-flow-software/mcp
   npm ci && npm run build
   ```

2. No Claude Desktop, abra **Configurações → Desenvolvedor → Editar configuração** e adicione (ajuste o caminho):

   ```json
   {
     "mcpServers": {
       "trampo-flow": {
         "command": "node",
         "args": ["/caminho/para/trampo-flow-software/mcp/dist/index.js"],
         "env": {
           "TRAMPO_API_URL": "https://trampo-flow.neubergerdev.com.br/api",
           "TRAMPO_API_TOKEN": "tfp_…"
         }
       }
     }
   }
   ```

3. Reinicie o Claude Desktop. **Confirme** pelas ferramentas do Trampo Flow na conversa.

**(b) Ponte `mcp-remote`, NÃO TESTADA.** O pacote [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) permite que clientes só-locais falem com servidores remotos e aceita `--header`. Em tese bastaria apontar `command: "npx"` e `args: ["-y", "mcp-remote", "<URL>", "--header", "Authorization:${TRAMPO_AUTH}"]` com a variável `TRAMPO_AUTH="Bearer tfp_…"` no `env` (o README do pacote recomenda esse formato, sem espaços ao redor dos dois-pontos, por causa de um problema de escape de argumentos em alguns clientes). Como não foi testado aqui e executa um pacote de terceiros, **avalie por conta própria** antes de usar.

Quando a 3.2.0 sair, o caminho recomendado no Claude Desktop passa a ser **Conectores** (parte A), sem token.

## B4. Automação e scripts

**Para quem é:** quem quer rodar algo sem ninguém na frente (cron, CI, bot). Para isso o token `tfp_` é o caminho certo; o OAuth exige uma pessoa clicando no navegador.

**Boas práticas**

- Crie **um token por automação**, com nome claro ("cron do resumo semanal"), para revogar só aquele se vazar.
- Use validade curta (30 a 90 dias) e guarde o token em um gerenciador de segredos ou variável de ambiente, nunca no repositório.
- Se a automação só consulta (relatório, resumo do funil), use um token **somente leitura**.
- Lembre dos limites: 60 escritas por minuto por token e nada apaga.

**Exemplo 1: cliente MCP em Node.** `npm i @modelcontextprotocol/sdk` e salve como `pipeline-summary.mjs`:

```js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const client = new Client({ name: 'meu-script', version: '1.0.0' });

await client.connect(
  new StreamableHTTPClientTransport(new URL(process.env.TRAMPO_MCP_URL), {
    requestInit: {
      headers: { Authorization: `Bearer ${process.env.TRAMPO_API_TOKEN}` },
    },
  }),
);

const result = await client.callTool({
  name: 'pipeline_summary',
  arguments: { staleDays: 7 },
});

console.log(result.content[0].text);
await client.close();
```

```bash
TRAMPO_MCP_URL=https://trampo-flow.neubergerdev.com.br/mcp \
TRAMPO_API_TOKEN=tfp_… \
node pipeline-summary.mjs
```

**Exemplo 2: `curl` na API REST** (mais simples quando você não precisa do MCP):

```bash
curl -s https://trampo-flow.neubergerdev.com.br/api/applications/stats \
  -H "Authorization: Bearer $TRAMPO_API_TOKEN"
```

**Exemplo 3: `curl` direto no MCP** (uma chamada de ferramenta, sem sessão):

```bash
curl -s -X POST https://trampo-flow.neubergerdev.com.br/mcp \
  -H "Authorization: Bearer $TRAMPO_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"pipeline_summary","arguments":{}}}'
```

**Erros comuns**

| Resposta                               | Causa e solução                                                                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `401` "Envie um token de integração…"  | Faltou o cabeçalho, ou o valor não começa com `Bearer tfp_`. No `curl`, confira as aspas e o `$`.                                               |
| `401` "inválido, expirado ou revogado" | O token venceu ou foi revogado. Crie outro.                                                                                                     |
| `403`                                  | A rota exige login na interface (por exemplo, apagar), ou o token é **somente leitura** e tentou escrever. Crie um token com leitura e escrita. |
| `429`                                  | Passou de 60 escritas por minuto. Espere e tente de novo.                                                                                       |
| `405` no `/mcp`                        | Só `POST` é aceito.                                                                                                                             |

## B5. Desenvolvimento local (stdio)

Para testar contra a sua própria stack local ou desenvolver o servidor MCP.

```bash
cd mcp
npm ci
npm run build

claude mcp add trampo-flow \
  -e TRAMPO_API_URL=http://localhost:5173/api \
  -e TRAMPO_API_TOKEN=tfp_… \
  -- node /caminho/para/trampo-flow-software/mcp/dist/index.js
```

**MCP Inspector** (interface para chamar as ferramentas na mão):

```bash
npx @modelcontextprotocol/inspector \
  -e TRAMPO_API_URL=http://localhost:5173/api \
  -e TRAMPO_API_TOKEN=tfp_… \
  node dist/index.js
```

Atenção: o endereço com `MCP_PROXY_AUTH_TOKEN` que o Inspector imprime é a senha do próprio Inspector, **outra coisa** que o `tfp_`. Não use os campos "Authentication" da interface dele: valem só para servidores remotos.

Variáveis do modo stdio: `TRAMPO_API_URL` e `TRAMPO_API_TOKEN` (obrigatórias; o token tem de começar com `tfp_`) e `TRAMPO_API_TIMEOUT_MS` (opcional, padrão 15000).

---

## Segurança, em resumo

- O token vale como a sua senha, menos apagar candidaturas. Não cole em chats nem em repositórios.
- Cada token enxerga só a conta de quem o criou.
- Revogar em **Configurações → Tokens de integração** corta o acesso na hora.
- Se um token vazar: revogue e crie outro.
