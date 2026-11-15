import { Plug } from 'lucide-react';
import { useState } from 'react';
import { useOAuthGrants } from '../../hooks/useOAuthGrants';
import { normalizeApiError } from '../../services/api/errors';
import {
  OAUTH_SCOPE_LABELS,
  type ConnectedApp,
} from '../../services/oauth.types';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Skeleton } from '../ui/Skeleton';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : 'nunca';
}

function describeScopes(scopes: string[]): string {
  return scopes.length === 0
    ? 'sem permissões'
    : scopes.map((scope) => OAUTH_SCOPE_LABELS[scope] ?? scope).join(' · ');
}

export function ConnectedAppsSection() {
  const { grants, revoke } = useOAuthGrants();
  const [toRevoke, setToRevoke] = useState<ConnectedApp | null>(null);

  async function handleRevoke() {
    if (!toRevoke) {
      return;
    }

    try {
      await revoke.mutateAsync(toRevoke.id);
      setToRevoke(null);
    } catch {
      // O erro aparece pelo estado da mutation.
    }
  }

  return (
    <section aria-labelledby="apps-title" className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-btn bg-surface-2 text-fg-soft">
          <Plug className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2
            id="apps-title"
            className="font-display text-lg font-semibold text-fg"
          >
            Aplicativos conectados
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Aplicativos que você autorizou pelo login (como o Claude). Revogar
            corta o acesso na hora; para voltar, é preciso autorizar de novo.
          </p>
        </div>
      </div>

      {grants.isPending ? (
        <div
          role="status"
          aria-label="Carregando aplicativos"
          className="space-y-2"
        >
          <Skeleton className="h-16 rounded-card" />
        </div>
      ) : grants.isError ? (
        <Alert
          title="Não foi possível carregar os aplicativos"
          description={normalizeApiError(grants.error).message}
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void grants.refetch()}
            >
              Tentar de novo
            </Button>
          }
        />
      ) : grants.data.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          Nenhum aplicativo conectado.
        </p>
      ) : (
        <Card>
          <ul
            aria-label="Aplicativos conectados"
            className="divide-y divide-line"
          >
            {grants.data.map((app) => (
              <li
                key={app.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">
                    {app.clientName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {describeScopes(app.scopes)} · conectado em{' '}
                    {formatDate(app.createdAt)} · último uso{' '}
                    {formatDate(app.lastUsedAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="danger-ghost"
                  size="sm"
                  onClick={() => setToRevoke(app)}
                  aria-label={`Revogar ${app.clientName}`}
                >
                  Revogar
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        isOpen={toRevoke !== null}
        title="Revogar aplicativo"
        description={`“${toRevoke?.clientName ?? ''}” perde o acesso à sua conta na hora. Para voltar, será preciso autorizar de novo.`}
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
