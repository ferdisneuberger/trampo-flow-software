import { CheckCircle2, KeyRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { authService } from '../services/api/auth.service';
import { getErrorMessage } from '../utils/errors';

type FormErrors = Partial<Record<'password' | 'confirmPassword', string>>;

function readResetToken(): string {
  const hash = window.location.hash;

  if (!hash.startsWith('#token=')) {
    return '';
  }

  return decodeURIComponent(hash.slice('#token='.length));
}

export function ResetPasswordPage() {
  const [token] = useState(readResetToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
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

    const nextErrors: FormErrors = {};

    if (password.length < 12) {
      nextErrors.password = 'A senha deve ter pelo menos 12 caracteres.';
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'As senhas não coincidem.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);

      return;
    }

    setErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      await authService.resetPassword({ token, password });
      setIsSuccess(true);
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthPageLayout>
        <Card className="p-6 text-center sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">
            Link inválido
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Este link de recuperação está incompleto ou expirou. Solicite um
            novo link para continuar.
          </p>
          <Link
            to="/esqueci-senha"
            className="mt-6 inline-block text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Solicitar novo link
          </Link>
        </Card>
      </AuthPageLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthPageLayout>
        <Card className="p-6 text-center sm:p-8">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-lg font-semibold tracking-tight text-ink-900">
            Senha redefinida
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Sua senha foi alterada e as sessões anteriores foram encerradas.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Entrar com a nova senha
          </Link>
        </Card>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout tagline="Crie uma nova senha">
      <Card className="p-6 sm:p-8">
        <div className="mb-6">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <KeyRound className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink-900">
            Nova senha
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Escolha uma senha com pelo menos 12 caracteres.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          <Input
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={256}
            required
            value={password}
            error={errors.password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({ ...current, password: undefined }));
            }}
          />

          <Input
            label="Confirmar nova senha"
            type="password"
            autoComplete="new-password"
            maxLength={256}
            required
            value={confirmPassword}
            error={errors.confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setErrors((current) => ({
                ...current,
                confirmPassword: undefined,
              }));
            }}
          />

          {formError && (
            <Alert
              tone="error"
              title="Não foi possível redefinir a senha"
              description={formError}
            />
          )}

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Redefinir senha
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
