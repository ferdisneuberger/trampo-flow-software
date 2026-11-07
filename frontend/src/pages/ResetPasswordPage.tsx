import { CheckCircle2, KeyRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { PasswordRequirements } from '../components/auth/PasswordRequirements';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PasswordInput } from '../components/ui/PasswordInput';
import { authService } from '../services/api/auth.service';
import { getErrorMessage } from '../utils/errors';
import {
  getPasswordError,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../utils/password';

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
  const passwordsMatch =
    confirmPassword.length > 0 && confirmPassword === password;
  const confirmPasswordError =
    confirmPassword.length > 0 && confirmPassword !== password
      ? 'As senhas não coincidem.'
      : errors.confirmPassword;

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

    const passwordError = getPasswordError(password);

    if (passwordError) {
      nextErrors.password = passwordError;
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
          <span className="mx-auto grid size-16 place-items-center rounded-xl border-2 border-ink-900 bg-danger-soft text-coral-dark shadow-hard-sm">
            <KeyRound className="size-8" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-extrabold tracking-[-0.06em] text-ink-900">
            Link inválido
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Este link de recuperação está incompleto ou expirou. Solicite um
            novo link para continuar.
          </p>
          <Link
            to="/esqueci-senha"
            className="mt-6 inline-block font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-ink-900 underline underline-offset-4 hover:text-coral-dark"
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
          <span className="mx-auto grid size-16 place-items-center rounded-xl border-2 border-ink-900 bg-success-soft text-ink-900 shadow-hard-sm">
            <CheckCircle2 className="size-8" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-extrabold tracking-[-0.06em] text-ink-900">
            Senha redefinida
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Sua senha foi alterada e as sessões anteriores foram encerradas.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-ink-900 underline underline-offset-4 hover:text-coral-dark"
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
          <span className="grid size-12 place-items-center rounded-xl border-2 border-ink-900 bg-yellow text-on-accent shadow-hard-sm">
            <KeyRound className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.06em] text-ink-900">
            Nova senha
          </h1>
          <p className="mt-1 text-sm leading-6 text-ink-500">
            Escolha uma senha com pelo menos {PASSWORD_MIN_LENGTH} caracteres,
            incluindo uma maiúscula, um número e um caractere especial.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          <div>
            <PasswordInput
              label="Nova senha"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              required
              aria-describedby="reset-password-requirements"
              value={password}
              error={errors.password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({
                  ...current,
                  password: undefined,
                  confirmPassword: undefined,
                }));
              }}
            />
            <PasswordRequirements
              id="reset-password-requirements"
              password={password}
              className="mt-2"
            />
          </div>

          <PasswordInput
            label="Confirmar nova senha"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            required
            value={confirmPassword}
            error={confirmPasswordError}
            valid={passwordsMatch}
            validMessage="As senhas coincidem."
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
            className="font-bold text-ink-900 underline underline-offset-4 hover:text-coral-dark"
          >
            Voltar para o login
          </Link>
        </p>
      </Card>
    </AuthPageLayout>
  );
}
