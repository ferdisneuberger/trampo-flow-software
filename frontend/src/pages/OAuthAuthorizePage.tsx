import { useMutation, useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldQuestion } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BrandLockup } from '../components/brand/Brand';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { queryKeys } from '../lib/query-keys';
import { normalizeApiError } from '../services/api/errors';
import { oauthService } from '../services/api/oauth.service';
import { safeHttpUrl } from '../utils/url';

/** Só os parâmetros de texto da URL; o servidor valida o conteúdo. */
function readParams(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {};

  for (const [key, value] of searchParams) {
    if (!(key in params)) {
      params[key] = value;
    }
  }

  return params;
}

/**
 * Tela de consentimento do OAuth (RFC 6749). Mostra quem pede acesso e o que
 * poderá fazer. A tela nunca monta uma URL de retorno por conta própria: só
 * segue o `redirectTo` que o servidor devolve depois de revalidar o pedido, e
 * pedido inválido mostra o motivo sem redirecionar.
 */
export function OAuthAuthorizePage() {
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  const params = useMemo(() => readParams(searchParams), [searchParams]);
  const [redirecting, setRedirecting] = useState(false);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  const preview = useQuery({
    queryKey: queryKeys.oauthPreview(search),
    queryFn: () => oauthService.preview(params),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const decide = useMutation({
    mutationFn: (approve: boolean) => oauthService.decide(params, approve),
  });

  async function handleDecision(approve: boolean) {
    setRedirectError(null);

    try {
      const { redirectTo } = await decide.mutateAsync(approve);
      const target = safeHttpUrl(redirectTo);

      if (!target) {
        setRedirectError('O endereço de retorno recebido não é seguro.');
        return;
      }

      setRedirecting(true);
      window.location.assign(target);
    } catch {
      // O erro aparece pelo estado da mutation.
    }
  }

  const busy = decide.isPending || redirecting;

  return (
    <main className="grid min-h-screen place-items-center px-5 py-8">
      <div className="w-full max-w-md space-y-6">
        <BrandLockup size="md" />

        {preview.isPending ? (
          <div
            role="status"
            aria-label="Carregando pedido de acesso"
            className="space-y-3"
          >
            <Skeleton className="h-8 rounded-card" />
            <Skeleton className="h-40 rounded-card" />
          </div>
        ) : preview.isError ? (
          <Alert
            title="Não foi possível autorizar"
            description={`${normalizeApiError(preview.error).message} Volte ao aplicativo e tente conectar de novo.`}
          />
        ) : (
          <Card className="space-y-5 p-5">
            <div className="space-y-2">
              <h1 className="font-display text-xl font-semibold text-fg">
                <span className="break-words">{preview.data.client.name}</span>{' '}
                quer acessar sua conta no Trampo Flow
              </h1>
              {preview.data.client.verified ? (
                <Badge tone="success">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  Aplicativo verificado (Claude)
                </Badge>
              ) : (
                <Badge tone="warning">
                  <ShieldQuestion className="size-3.5" aria-hidden="true" />
                  Aplicativo não verificado
                </Badge>
              )}
            </div>

            {!preview.data.client.verified && (
              <Alert
                tone="info"
                title="Confira o destino antes de autorizar"
                description="Este aplicativo não é o Claude. Só autorize se você reconhece o nome e o endereço abaixo."
              />
            )}

            <p className="text-sm text-fg-soft">
              Depois de decidir, você volta para{' '}
              <strong
                data-testid="redirect-host"
                className="break-all font-semibold text-fg"
              >
                {preview.data.client.redirectHost}
              </strong>
              .
            </p>

            <div className="space-y-2">
              <h2 className="text-[13px] font-medium text-muted">
                O aplicativo poderá
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-fg">
                {preview.data.scopes.map((scope) => (
                  <li key={scope.id}>{scope.label}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h2 className="text-[13px] font-medium text-muted">
                O aplicativo não poderá
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-fg">
                {preview.data.cannotDo.map((item) => (
                  <li key={item}>
                    {item[0]?.toUpperCase()}
                    {item.slice(1)}
                  </li>
                ))}
              </ul>
            </div>

            {(decide.isError || redirectError) && (
              <p role="alert" className="text-xs font-medium text-danger">
                {redirectError ?? normalizeApiError(decide.error).message}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void handleDecision(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                isLoading={busy}
                onClick={() => void handleDecision(true)}
              >
                Autorizar
              </Button>
            </div>
            <p className="text-xs leading-5 text-muted">
              Você pode revogar o acesso a qualquer momento em Configurações →
              MCP → Aplicativos conectados.
            </p>
          </Card>
        )}
      </div>
    </main>
  );
}
