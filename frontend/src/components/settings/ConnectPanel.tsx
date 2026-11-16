import { Cable, ExternalLink } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Alert } from '../ui/Alert';
import { AGENT_DOCS, AGENT_TABS, type AgentTabId } from './connect-agents';

const GUIDE_URL =
  'https://github.com/ferdisneuberger/trampo-flow-software/blob/main/docs/guia-conexao-mcp.md';

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-btn border border-line bg-surface px-3 py-2 font-mono text-[12px] leading-5 text-fg">
      {children}
    </pre>
  );
}

function Method({ children }: { children: ReactNode }) {
  return <p className="text-[13px] font-medium text-muted">{children}</p>;
}

function Steps({ children }: { children: ReactNode }) {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-fg-soft">
      {children}
    </ol>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em] text-fg">
      {children}
    </code>
  );
}

function mcpUrl(): string {
  return `${window.location.origin}/mcp`;
}

function TabContent({
  tab,
  oauthEnabled,
}: {
  tab: AgentTabId;
  oauthEnabled: boolean;
}) {
  const url = mcpUrl();

  switch (tab) {
    case 'claude':
      return oauthEnabled ? (
        <div className="space-y-3">
          <Method>
            Com login (sem token), no site, no app do celular e no Desktop
          </Method>
          <Steps>
            <li>
              No Claude, abra Customize (Personalizar) → Connectors (Conectores)
              → Add → <strong>Add custom connector</strong>.
            </li>
            <li>
              Informe um nome e o endereço <Mono>{url}</Mono>. Em autenticação,
              escolha entrar agora (<em>Sign in now</em>).
            </li>
            <li>
              Entre no Trampo Flow (senha ou Google) e clique em{' '}
              <strong>Autorizar</strong>. Não há token para copiar.
            </li>
          </Steps>
          <p className="text-xs leading-5 text-muted">
            O conector adicionado no claude.ai também vale no app do celular da
            mesma conta. No Claude Desktop use a mesma tela de Conectores, não o
            arquivo de configuração. Para desconectar, revogue em Aplicativos
            conectados (abaixo) e remova o conector no Claude.
          </p>
        </div>
      ) : (
        <p className="text-sm leading-6 text-fg-soft">
          O Claude pede login por OAuth para servidores remotos, e ele ainda não
          está ligado nesta instalação. Enquanto isso, use um token de
          integração em clientes que aceitam um cabeçalho de autorização (Claude
          Code, Cursor, VS Code, OpenCode).
        </p>
      );
    case 'code':
      return (
        <div className="space-y-3">
          {oauthEnabled && (
            <>
              <Method>Com login (sem token)</Method>
              <p className="text-sm text-fg-soft">
                Rode o comando e, em <Mono>/mcp</Mono>, escolha autenticar.
              </p>
              <Code>{`claude mcp add --transport http trampo-flow ${url} --scope user`}</Code>
            </>
          )}
          <Method>Com um token de integração (crie abaixo)</Method>
          <Code>
            {`claude mcp add --transport http trampo-flow ${url} \\\n  --scope user \\\n  --header "Authorization: Bearer tfp_…"`}
          </Code>
        </div>
      );
    case 'cursor':
      return (
        <div className="space-y-3">
          <Method>Com um token de integração</Method>
          <p className="text-sm text-fg-soft">
            Em <Mono>~/.cursor/mcp.json</Mono> (todos os projetos) ou{' '}
            <Mono>.cursor/mcp.json</Mono> (o projeto). Guarde o token na
            variável de ambiente <Mono>TRAMPO_API_TOKEN</Mono>:
          </p>
          <Code>
            {`{\n  "mcpServers": {\n    "trampo-flow": {\n      "url": "${url}",\n      "headers": {\n        "Authorization": "Bearer \${env:TRAMPO_API_TOKEN}"\n      }\n    }\n  }\n}`}
          </Code>
          {oauthEnabled && (
            <p className="text-xs leading-5 text-muted">
              O Cursor também sabe abrir o login (OAuth), mas usa endereços de
              retorno próprios que o administrador do servidor precisa liberar.
              Se aparecer “redirect_uri não permitido”, veja o guia.
            </p>
          )}
        </div>
      );
    case 'vscode':
      return (
        <div className="space-y-3">
          <Method>Com um token de integração</Method>
          <p className="text-sm text-fg-soft">
            Em <Mono>.vscode/mcp.json</Mono>. O VS Code pede o token ao abrir, e
            ele não fica no arquivo:
          </p>
          <Code>
            {`{\n  "inputs": [\n    {\n      "type": "promptString",\n      "id": "trampo-token",\n      "description": "Token de integração do Trampo Flow",\n      "password": true\n    }\n  ],\n  "servers": {\n    "trampo-flow": {\n      "type": "http",\n      "url": "${url}",\n      "headers": { "Authorization": "Bearer \${input:trampo-token}" }\n    }\n  }\n}`}
          </Code>
          {oauthEnabled && (
            <p className="text-xs leading-5 text-muted">
              O VS Code também tem login por OAuth, mas a compatibilidade com
              este servidor não foi verificada.
            </p>
          )}
        </div>
      );
    case 'opencode':
      return (
        <div className="space-y-3">
          {oauthEnabled && (
            <>
              <Method>Com login (sem token)</Method>
              <p className="text-sm text-fg-soft">
                Para servidores remotos o OpenCode usa OAuth por padrão:
              </p>
              <Code>{`opencode mcp add trampo-flow --url ${url}\nopencode mcp auth trampo-flow`}</Code>
            </>
          )}
          <Method>Com um token de integração</Method>
          <p className="text-sm text-fg-soft">
            Em <Mono>opencode.json</Mono>, com o token na variável{' '}
            <Mono>TRAMPO_API_TOKEN</Mono> e o OAuth desligado:
          </p>
          <Code>
            {`{\n  "$schema": "https://opencode.ai/config.json",\n  "mcp": {\n    "servers": {\n      "trampo-flow": {\n        "type": "remote",\n        "url": "${url}",\n        "oauth": false,\n        "headers": { "Authorization": "Bearer {env:TRAMPO_API_TOKEN}" }\n      }\n    }\n  }\n}`}
          </Code>
          <p className="text-xs leading-5 text-muted">
            Versões antigas do OpenCode usam <Mono>mcp.trampo-flow</Mono>{' '}
            direto, sem <Mono>servers</Mono>: confira a documentação da sua
            versão.
          </p>
        </div>
      );
    case 'others':
      return (
        <div className="space-y-3 text-sm leading-6 text-fg-soft">
          <p>
            Qualquer cliente MCP que fale Streamable HTTP funciona: use o
            endereço <Mono>{url}</Mono> e o cabeçalho{' '}
            <Mono>Authorization: Bearer tfp_…</Mono> com um token de integração.
          </p>
          {oauthEnabled && (
            <p>
              Clientes que implementam a autorização do MCP (descoberta pelo{' '}
              <Mono>401</Mono>, PKCE e registro dinâmico) podem usar o login. O
              endereço de retorno do cliente precisa estar liberado no servidor
              (o do Claude já está).
            </p>
          )}
          <p>
            No Claude Desktop, o arquivo de configuração só aceita servidores
            locais (modo local, descrito no guia).
          </p>
        </div>
      );
    case 'automation':
      return (
        <div className="space-y-2 text-sm leading-6 text-fg-soft">
          <p>
            Scripts, cron e CI não têm navegador: use um token de integração, um
            por automação, com validade curta. Para só consultar, crie-o como{' '}
            <strong>Somente leitura</strong>.
          </p>
          <Code>
            {`curl -s ${window.location.origin}/api/applications/stats \\\n  -H "Authorization: Bearer $TRAMPO_API_TOKEN"`}
          </Code>
        </div>
      );
  }
}

export function ConnectPanel({ oauthEnabled }: { oauthEnabled: boolean }) {
  const [active, setActive] = useState<AgentTabId>('claude');
  const baseId = useId();
  const doc = AGENT_DOCS[active];

  return (
    <section aria-labelledby="connect-title" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-btn bg-surface-2 text-fg-soft">
          <Cable className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2
            id="connect-title"
            className="font-display text-lg font-semibold text-fg"
          >
            Como conectar
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Escolha o agente de IA que você usa. Cada aba traz o passo a passo e
            o link da documentação dele. O guia completo, com o que foi testado
            e os erros comuns, está{' '}
            <a
              href={GUIDE_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-fg underline underline-offset-2"
            >
              aqui
            </a>
            .
          </p>
        </div>
      </div>

      {!oauthEnabled && (
        <Alert
          tone="info"
          title="Onde o token funciona hoje"
          description="Funciona no Claude Code (terminal) e em clientes MCP que aceitam um cabeçalho de autorização, como Cursor, VS Code e OpenCode. No Claude Desktop só pelo modo local. No Claude web e no celular ainda não: eles pedem login por OAuth, que está a caminho."
        />
      )}

      <div className="rounded-card border border-line bg-surface-2 p-4">
        <div
          role="tablist"
          aria-label="Agentes de IA"
          className="mb-4 flex flex-wrap gap-2"
        >
          {AGENT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={active === tab.id}
              aria-controls={`${baseId}-panel`}
              onClick={() => setActive(tab.id)}
              className={cn(
                'rounded-btn px-3 py-1.5 text-[13px] font-medium transition-colors',
                active === tab.id
                  ? 'bg-fg text-canvas'
                  : 'bg-surface text-fg-soft hover:text-fg',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${active}`}
          className="space-y-4"
        >
          <TabContent tab={active} oauthEnabled={oauthEnabled} />
          {doc && (
            <a
              href={doc.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg underline underline-offset-2"
            >
              Documentação: {doc.label}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          Instruções conferidas na documentação oficial de cada agente; não
          testadas em todos os aplicativos.
        </p>
      </div>
    </section>
  );
}
