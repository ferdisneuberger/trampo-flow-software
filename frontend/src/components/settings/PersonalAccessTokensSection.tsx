import { Check, Copy, KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { usePersonalAccessTokens } from '../../hooks/usePersonalAccessTokens';
import { normalizeApiError } from '../../services/api/errors';
import {
  getTokenState,
  type CreatedPersonalAccessToken,
  type PersonalAccessToken,
  type PersonalAccessTokenState,
} from '../../services/personal-access-tokens.types';
import { cn } from '../../utils/cn';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Skeleton } from '../ui/Skeleton';

const EXPIRATION_OPTIONS = [
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: '180', label: '180 dias' },
  { value: '365', label: '1 ano' },
];

const STATE_LABELS: Record<PersonalAccessTokenState, string> = {
  active: 'Ativo',
  expired: 'Expirado',
  revoked: 'Revogado',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : 'nunca';
}

function mcpUrl(): string {
  return `${window.location.origin}/mcp`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => void handleCopy()}
      aria-label={label}
    >
      {copied ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      {copied ? 'Copiado' : 'Copiar'}
    </Button>
  );
}

function CreatedTokenNotice({
  token,
  onDismiss,
}: {
  token: CreatedPersonalAccessToken;
  onDismiss: () => void;
}) {
  const url = mcpUrl();
  const command = [
    `claude mcp add --transport http trampo-flow ${url} \\`,
    `  --header "Authorization: Bearer ${token.token}"`,
  ].join('\n');

  return (
    <div
      role="status"
      className="space-y-4 rounded-card border border-success/30 bg-success-soft p-4"
    >
      <div>
        <p className="text-sm font-semibold text-fg">
          Token “{token.name}” criado
        </p>
        <p className="mt-1 text-sm leading-6 text-fg-soft">
          Copie agora: ele não aparece de novo. Se perder, revogue e crie outro.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code
          data-testid="created-token"
          className="min-w-0 flex-1 break-all rounded-btn border border-line bg-surface px-3 py-2 font-mono text-[13px] text-fg"
        >
          {token.token}
        </code>
        <CopyButton value={token.token} label="Copiar token" />
      </div>
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-muted">
          Para conectar no Claude Code
        </p>
        <pre className="overflow-x-auto rounded-btn border border-line bg-surface px-3 py-2 font-mono text-[12px] leading-5 text-fg">
          {command}
        </pre>
        <CopyButton value={command} label="Copiar comando" />
        <p className="text-xs leading-5 text-muted">
          Em outros clientes MCP, use o endereço{' '}
          <code className="font-mono text-fg">{url}</code> (Streamable HTTP) com
          o cabeçalho{' '}
          <code className="font-mono text-fg">Authorization: Bearer</code> e o
          token acima.
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          Já copiei
        </Button>
      </div>
    </div>
  );
}

function TokenRow({
  token,
  onRevoke,
}: {
  token: PersonalAccessToken;
  onRevoke: (token: PersonalAccessToken) => void;
}) {
  const state = getTokenState(token);

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-fg">{token.name}</p>
          <span
            className={cn(
              'rounded-full px-2 py-px text-[11px] font-medium',
              state === 'active'
                ? 'bg-success-soft text-success'
                : 'bg-surface-2 text-muted',
            )}
          >
            {STATE_LABELS[state]}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          <span className="font-mono">{token.prefix}…</span> · último uso{' '}
          {formatDate(token.lastUsedAt)} ·{' '}
          {state === 'revoked'
            ? `revogado em ${formatDate(token.revokedAt)}`
            : `${state === 'expired' ? 'expirou' : 'expira'} em ${formatDate(token.expiresAt)}`}
        </p>
      </div>
      {state === 'active' && (
        <Button
          type="button"
          variant="danger-ghost"
          size="sm"
          onClick={() => onRevoke(token)}
          aria-label={`Revogar token ${token.name}`}
        >
          Revogar
        </Button>
      )}
    </li>
  );
}

export function PersonalAccessTokensSection() {
  const { tokens, create, revoke } = usePersonalAccessTokens();
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('90');
  const [created, setCreated] = useState<CreatedPersonalAccessToken | null>(
    null,
  );
  const [toRevoke, setToRevoke] = useState<PersonalAccessToken | null>(null);

  const trimmedName = name.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedName) {
      return;
    }

    try {
      const result = await create.mutateAsync({
        name: trimmedName,
        expiresInDays: Number(expiresInDays),
      });
      setCreated(result);
      setName('');
    } catch {
      // O erro aparece pelo estado da mutation.
    }
  }

  async function handleRevoke() {
    if (!toRevoke) {
      return;
    }

    try {
      await revoke.mutateAsync(toRevoke.id);
      if (created?.id === toRevoke.id) {
        setCreated(null);
      }
      setToRevoke(null);
    } catch {
      // O erro aparece pelo estado da mutation.
    }
  }

  return (
    <section aria-labelledby="tokens-title" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-btn bg-surface-2 text-fg-soft">
          <KeyRound className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2
            id="tokens-title"
            className="font-display text-lg font-semibold text-fg"
          >
            Tokens de integração
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Deixe agentes de IA (Claude Code, Claude Desktop ou qualquer cliente
            MCP) consultarem e atualizarem suas candidaturas. O token dá acesso
            só à sua conta, não apaga candidaturas e pode ser revogado a
            qualquer momento.
          </p>
        </div>
      </div>

      <Card className="p-4">
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <Input
            label="Nome"
            placeholder="Claude Code no notebook"
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            containerClassName="flex-1"
          />
          <Select
            label="Validade"
            value={expiresInDays}
            options={EXPIRATION_OPTIONS}
            onChange={(event) => setExpiresInDays(event.target.value)}
            containerClassName="sm:w-36"
          />
          <Button
            type="submit"
            isLoading={create.isPending}
            disabled={!trimmedName}
          >
            Criar token
          </Button>
        </form>
        {create.isError && (
          <p role="alert" className="mt-3 text-xs font-medium text-danger">
            {normalizeApiError(create.error).message}
          </p>
        )}
      </Card>

      {created && (
        <CreatedTokenNotice
          token={created}
          onDismiss={() => setCreated(null)}
        />
      )}

      {tokens.isPending ? (
        <div role="status" aria-label="Carregando tokens" className="space-y-2">
          <Skeleton className="h-16 rounded-card" />
          <Skeleton className="h-16 rounded-card" />
        </div>
      ) : tokens.isError ? (
        <Alert
          title="Não foi possível carregar os tokens"
          description={normalizeApiError(tokens.error).message}
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void tokens.refetch()}
            >
              Tentar de novo
            </Button>
          }
        />
      ) : tokens.data.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          Nenhum token criado ainda.
        </p>
      ) : (
        <Card>
          <ul
            aria-label="Tokens de integração"
            className="divide-y divide-line"
          >
            {tokens.data.map((token) => (
              <TokenRow key={token.id} token={token} onRevoke={setToRevoke} />
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        isOpen={toRevoke !== null}
        title="Revogar token"
        description={`O token “${toRevoke?.name ?? ''}” para de funcionar na hora. Quem estiver usando precisará de um token novo.`}
        confirmLabel="Revogar"
        isLoading={revoke.isPending}
        onConfirm={() => void handleRevoke()}
        onClose={() => {
          revoke.reset();
          setToRevoke(null);
        }}
      >
        {revoke.isError && (
          <p role="alert" className="mt-3 text-xs font-medium text-danger">
            {normalizeApiError(revoke.error).message}
          </p>
        )}
      </ConfirmDialog>
    </section>
  );
}
