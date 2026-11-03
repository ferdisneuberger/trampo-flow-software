import { CheckCircle2, MailCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { Button } from '../components/ui/Button';
import { ButtonLink } from '../components/ui/ButtonLink';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/auth-context';
import { authService } from '../services/api/auth.service';
import { getErrorMessage } from '../utils/errors';

function readVerificationToken(): string {
  const hash = window.location.hash;

  if (!hash.startsWith('#token=')) {
    return '';
  }

  return decodeURIComponent(hash.slice('#token='.length)).toUpperCase();
}

export function VerifyEmailPage() {
  const { isAuthenticated, refreshProfile } = useAuth();
  const [code, setCode] = useState(readVerificationToken);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (window.location.hash.startsWith('#token=')) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (code.trim().length === 0) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await authService.verifyEmail({ token: code.trim() });

      if (isAuthenticated) {
        void refreshProfile();
      }

      setIsSuccess(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <AuthPageLayout>
        <Card className="p-6 text-center sm:p-8">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-lg font-semibold tracking-tight text-ink-900">
            E-mail confirmado
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Sua conta está verificada e já pode criar candidaturas.
          </p>
          <ButtonLink
            to={isAuthenticated ? '/candidaturas' : '/login'}
            className="mt-6 w-full"
          >
            {isAuthenticated ? 'Ir para o quadro' : 'Entrar na conta'}
          </ButtonLink>
        </Card>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout tagline="Confirme seu e-mail">
      <Card className="p-6 sm:p-8">
        <div className="mb-6">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <MailCheck className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink-900">
            Informe o código
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-500">
            Enviamos um código de 6 caracteres para o seu e-mail. Ele expira em
            24 horas.
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
            maxLength={8}
            required
            value={code}
            error={error ?? undefined}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase());
              setError(null);
            }}
          />

          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
            disabled={code.trim().length === 0}
          >
            Confirmar e-mail
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          <Link
            to="/login"
            className="font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Voltar para o login
          </Link>
        </p>
      </Card>
    </AuthPageLayout>
  );
}
