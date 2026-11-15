import { Cable } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Alert } from '../ui/Alert';

const GUIDE_URL =
  'https://github.com/ferdisneuberger/trampo-flow-software/blob/main/docs/guia-conexao-mcp.md';

type TabId = 'web' | 'code' | 'others' | 'automation';

const TABS: { id: TabId; label: string }[] = [
  { id: 'web', label: 'Claude web e celular' },
  { id: 'code', label: 'Claude Code' },
  { id: 'others', label: 'Outros clientes' },
  { id: 'automation', label: 'Automação' },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-btn border border-line bg-surface px-3 py-2 font-mono text-[12px] leading-5 text-fg">
      {children}
    </pre>
  );
}

function mcpUrl(): string {
  return `${window.location.origin}/mcp`;
}

function Steps({ children }: { children: ReactNode }) {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-fg-soft">
      {children}
    </ol>
  );
}

function TabContent({
  tab,
  oauthEnabled,
}: {
  tab: TabId;
  oauthEnabled: boolean;
}) {
  const url = mcpUrl();

  switch (tab) {
    case 'web':
      return oauthEnabled ? (
        <div className="space-y-3">
          <Steps>
            <li>
              No Claude, abra Configurações → Conectores e adicione um conector
              personalizado.
            </li>
            <li>
              Informe o endereço{' '}
              <code className="font-mono text-fg">{url}</code>.
            </li>
            <li>
              Entre no Trampo Flow (senha ou Google) e clique em{' '}
              <strong>Autorizar</strong>. Não há token para copiar.
            </li>
          </Steps>
          <p className="text-xs leading-5 text-muted">
            Para desconectar, revogue em Aplicativos conectados (abaixo) e
            remova o conector no Claude.
          </p>
        </div>
      ) : (
        <p className="text-sm leading-6 text-fg-soft">
          O Claude web e o celular pedem login por OAuth, que ainda não está
          ligado nesta instalação. Enquanto isso, use um token de integração em
          clientes que aceitam um cabeçalho de autorização (aba “Outros
          clientes”).
        </p>
      );
    case 'code':
      return (
        <div className="space-y-3">
          {oauthEnabled && (
            <>
              <p className="text-sm text-fg-soft">
                Com login (sem token): rode o comando e, em{' '}
                <code className="font-mono text-fg">/mcp</code>, escolha
                autenticar.
              </p>
              <Code>{`claude mcp add --transport http trampo-flow ${url} --scope user`}</Code>
            </>
          )}
          <p className="text-sm text-fg-soft">
            Com um token de integração (crie abaixo):
          </p>
          <Code>
            {`claude mcp add --transport http trampo-flow ${url} \\\n  --scope user \\\n  --header "Authorization: Bearer tfp_…"`}
          </Code>
        </div>
      );
    case 'others':
      return (
        <div className="space-y-2 text-sm leading-6 text-fg-soft">
          <p>
            Cursor, VS Code e outros que aceitam cabeçalho: use o endereço{' '}
            <code className="font-mono text-fg">{url}</code> (Streamable HTTP) e
            o cabeçalho{' '}
            <code className="font-mono text-fg">
              Authorization: Bearer tfp_…
            </code>
            .
          </p>
          <p>
            No Claude Desktop, o arquivo de configuração só aceita servidores
            locais (modo local, descrito no guia).
            {oauthEnabled
              ? ' Pela tela de Conectores o Desktop usa o login, como no Claude web.'
              : ''}
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
  const [active, setActive] = useState<TabId>('web');
  const baseId = useId();

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
            Escolha onde você usa o agente de IA. O guia completo, com o que foi
            testado e os erros comuns, está{' '}
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
          description="Funciona no Claude Code (terminal) e em clientes MCP que aceitam um cabeçalho de autorização, como Cursor e VS Code. No Claude Desktop só pelo modo local. No Claude web e no celular ainda não: eles pedem login por OAuth, que está a caminho."
        />
      )}

      <div className="rounded-card border border-line bg-surface-2 p-4">
        <div
          role="tablist"
          aria-label="Formas de conexão"
          className="mb-4 flex flex-wrap gap-2"
        >
          {TABS.map((tab) => (
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
        >
          <TabContent tab={active} oauthEnabled={oauthEnabled} />
        </div>
      </div>
    </section>
  );
}
