import { CheckCircle2, LogOut, MailCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AuthLoadingScreen } from '../components/auth/AuthLoadingScreen';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { ResendVerificationButton } from '../components/auth/ResendVerificationButton';
import { Button } from '../components/ui/Button';
import { ButtonLink } from '../components/ui/ButtonLink';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/auth-context';
import { useLogout } from '../hooks/useLogout';
import { authService } from '../services/api/auth.service';
import { getErrorMessage } from '../utils/errors';
import { safeRedirectPath } from '../utils/url';
import {
  formatVerificationCode,
  isVerificationCodeComplete,
} from '../utils/verification-code';

function readVerificationToken(): string {
  const hash = window.location.hash;

  if (!hash.startsWith('#token=')) {
    return '';
  }

  return formatVerificationCode(
    decodeURIComponent(hash.slice('#token='.length)),
  );
}

export function VerifyEmailPage() {
  const { user, isAuthenticated, isLoading, refreshProfile } = useAuth();
  const { logout, isPending: isLoggingOut } = useLogout();
  const location = useLocation();
  const [code, setCode] = useState(readVerificationToken);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const isCodeComplete = isVerificationCodeComplete(code);
  const from =
    safeRedirectPath((location.state as { from?: unknown } | null)?.from) ??
    '/candidaturas';

  useEffect(() => {
    function syncTokenFromHash() {
      const token = readVerificationToken();

      if (token) {
        setCode(token);
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}`,
        );
      }
    }

    syncTokenFromHash();
    window.addEventListener('hashchange', syncTokenFromHash);

    return () => window.removeEventListener('hashchange', syncTokenFromHash);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isCodeComplete) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await authService.verifyEmail({ token: code.trim() });

      if (isAuthenticated) {
        try {
          await refreshProfile();
        } catch {
          // A confirmação já foi aceita; o perfil será recarregado depois.
        }
      }

      setIsSuccess(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (isSuccess) {
    return (
      <AuthPageLayout>
        <Card className="p-6 text-center sm:p-8">
          <span className="mx-auto grid size-16 place-items-center rounded-xl border-2 border-ink-900 bg-success-soft text-ink-900 shadow-hard-sm">
            <CheckCircle2 className="size-8" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-extrabold tracking-[-0.06em] text-ink-900">
            E-mail confirmado
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Sua conta está verificada e já pode criar candidaturas.
          </p>
          <ButtonLink
            to={isAuthenticated ? from : '/login'}
            className="mt-6 w-full"
          >
            {isAuthenticated ? 'Ir para o quadro' : 'Entrar na conta'}
          </ButtonLink>
        </Card>
      </AuthPageLayout>
    );
  }

  if (isAuthenticated && user?.emailVerified) {
    return <Navigate to={from} replace />;
  }

  return (
    <AuthPageLayout tagline="Confirme seu e-mail">
      <Card className="p-6 sm:p-8">
        <div className="mb-6">
          <span className="grid size-12 place-items-center rounded-xl border-2 border-ink-900 bg-yellow text-on-accent shadow-hard-sm">
            <MailCheck className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.06em] text-ink-900">
            Informe o código
          </h1>
          <p className="mt-1 text-sm leading-6 text-ink-500">
            {isAuthenticated && user?.email ? (
              <>
                Enviamos um código de 6 caracteres para{' '}
                <strong className="text-ink-900">{user.email}</strong>. Ele
                expira em 12 horas.
              </>
            ) : (
              'Enviamos um código de 6 caracteres para o seu e-mail. Ele expira em 12 horas.'
            )}
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <Input
            label="Código de verificação"
            placeholder="ADK-7YP"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={7}
            required
            value={code}
            error={error ?? undefined}
            onChange={(event) => {
              setCode(formatVerificationCode(event.target.value, code));
              setError(null);
            }}
          />

          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
            disabled={!isCodeComplete}
          >
            Confirmar e-mail
          </Button>
        </form>

        {isAuthenticated && user && !user.emailVerified && (
          <div className="mt-5 border-t-2 border-dashed border-ink-900/20 pt-5">
            <p className="mb-3 text-sm text-ink-500">
              Não recebeu o e-mail? Envie novamente.
            </p>
            <ResendVerificationButton />
          </div>
        )}

        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => void logout()}
            disabled={isLoggingOut}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-transparent px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-ink-500 transition hover:border-ink-900 hover:bg-surface hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sair e usar outra conta
          </button>
        ) : (
          <p className="mt-6 text-center text-sm text-ink-500">
            <Link
              to="/login"
              className="font-bold text-ink-900 underline underline-offset-4 hover:text-coral-dark"
            >
              Voltar para o login
            </Link>
          </p>
        )}
      </Card>
    </AuthPageLayout>
  );
}
