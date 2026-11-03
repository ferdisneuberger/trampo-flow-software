import { CheckCircle2, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { ButtonLink } from '../components/ui/ButtonLink';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { authService } from '../services/api/auth.service';
import { getErrorMessage } from '../utils/errors';

type FormErrors = Partial<
  Record<'email' | 'password' | 'confirmPassword' | 'terms' | 'form', string>
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  function validate(): FormErrors {
    const next: FormErrors = {};

    if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = 'Informe um e-mail válido.';
    }

    if (password.length < 12) {
      next.password = 'A senha deve ter pelo menos 12 caracteres.';
    }

    if (confirmPassword !== password) {
      next.confirmPassword = 'As senhas não coincidem.';
    }

    if (!termsAccepted) {
      next.terms = 'É necessário aceitar os termos de uso.';
    }

    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);

      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await authService.register({
        email: email.trim().toLowerCase(),
        password,
        termsAccepted,
      });
      setIsSuccess(true);
    } catch (requestError) {
      setErrors({ form: getErrorMessage(requestError) });
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
            Cadastro recebido
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Enviamos um código de verificação para{' '}
            <strong className="text-ink-700">
              {email.trim().toLowerCase()}
            </strong>
            . Confira também a caixa de spam.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <ButtonLink to="/verificar-email" className="w-full">
              Já tenho o código
            </ButtonLink>
            <Link
              to="/login"
              className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              Voltar para o login
            </Link>
          </div>
        </Card>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout tagline="Crie sua conta para começar">
      <Card className="p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">
            Criar conta
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Cadastre-se com seu e-mail e confirme o código recebido.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            required
            value={email}
            error={errors.email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({
                ...current,
                email: undefined,
                form: undefined,
              }));
            }}
          />

          <Input
            label="Senha"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={256}
            required
            hint="Mínimo de 12 caracteres."
            value={password}
            error={errors.password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({
                ...current,
                password: undefined,
                form: undefined,
              }));
            }}
          />

          <Input
            label="Confirmar senha"
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
                form: undefined,
              }));
            }}
          />

          <div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm text-ink-700">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-line accent-brand-600"
                checked={termsAccepted}
                onChange={(event) => {
                  setTermsAccepted(event.target.checked);
                  setErrors((current) => ({
                    ...current,
                    terms: undefined,
                    form: undefined,
                  }));
                }}
              />
              <span>
                Li e aceito os{' '}
                <Link
                  to="/termos"
                  className="font-semibold text-brand-700 underline-offset-4 hover:underline"
                >
                  termos de uso
                </Link>
                .
              </span>
            </label>
            {errors.terms && (
              <p className="mt-1.5 text-xs font-medium text-rose-600">
                {errors.terms}
              </p>
            )}
          </div>

          {errors.form && (
            <Alert
              tone="error"
              title="Não foi possível criar a conta"
              description={errors.form}
            />
          )}

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            <UserPlus className="size-4" aria-hidden="true" />
            Criar conta
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Já tem conta?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </Card>
    </AuthPageLayout>
  );
}
