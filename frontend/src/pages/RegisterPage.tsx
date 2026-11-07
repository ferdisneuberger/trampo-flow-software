import { CheckCircle2, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { PasswordRequirements } from '../components/auth/PasswordRequirements';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { ButtonLink } from '../components/ui/ButtonLink';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PasswordInput } from '../components/ui/PasswordInput';
import { authService } from '../services/api/auth.service';
import { getErrorMessage } from '../utils/errors';
import {
  getPasswordError,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../utils/password';

type FormErrors = Partial<
  Record<
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'password'
    | 'confirmPassword'
    | 'terms'
    | 'form',
    string
  >
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX_LENGTH = 30;

export function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const passwordsMatch =
    confirmPassword.length > 0 && confirmPassword === password;
  const confirmPasswordError =
    confirmPassword.length > 0 && confirmPassword !== password
      ? 'As senhas não coincidem.'
      : errors.confirmPassword;

  function validate(): FormErrors {
    const next: FormErrors = {};

    if (firstName.trim().length === 0) {
      next.firstName = 'Informe seu nome.';
    }

    if (lastName.trim().length === 0) {
      next.lastName = 'Informe seu último nome.';
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = 'Informe um e-mail válido.';
    }

    const passwordError = getPasswordError(password);

    if (passwordError) {
      next.password = passwordError;
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
        firstName: firstName.trim(),
        lastName: lastName.trim(),
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
          <span className="mx-auto grid size-16 place-items-center rounded-xl border-2 border-ink-900 bg-success-soft text-ink-900 shadow-hard-sm">
            <CheckCircle2 className="size-8" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-extrabold tracking-[-0.06em] text-ink-900">
            Cadastro recebido
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Enviamos um código de verificação para{' '}
            <strong className="text-ink-900">
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
              className="font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-ink-900 underline underline-offset-4 hover:text-coral-dark"
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
          <span className="grid size-12 place-items-center rounded-xl border-2 border-ink-900 bg-yellow text-on-accent shadow-hard-sm">
            <UserPlus className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.06em] text-ink-900">
            Criar conta
          </h1>
          <p className="mt-1 text-sm leading-6 text-ink-500">
            Cadastra seus dados e confirma o código que chega no e-mail.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nome"
              autoComplete="given-name"
              autoCapitalize="words"
              maxLength={NAME_MAX_LENGTH}
              required
              value={firstName}
              error={errors.firstName}
              onChange={(event) => {
                setFirstName(event.target.value);
                setErrors((current) => ({
                  ...current,
                  firstName: undefined,
                  form: undefined,
                }));
              }}
            />

            <Input
              label="Último nome"
              autoComplete="family-name"
              autoCapitalize="words"
              maxLength={NAME_MAX_LENGTH}
              required
              value={lastName}
              error={errors.lastName}
              onChange={(event) => {
                setLastName(event.target.value);
                setErrors((current) => ({
                  ...current,
                  lastName: undefined,
                  form: undefined,
                }));
              }}
            />
          </div>

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

          <div>
            <PasswordInput
              label="Senha"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              required
              aria-describedby="register-password-requirements"
              value={password}
              error={errors.password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({
                  ...current,
                  password: undefined,
                  confirmPassword: undefined,
                  form: undefined,
                }));
              }}
            />
            <PasswordRequirements
              id="register-password-requirements"
              password={password}
              className="mt-2"
            />
          </div>

          <PasswordInput
            label="Confirmar senha"
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
                form: undefined,
              }));
            }}
          />

          <div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-ink-900 bg-surface p-4 text-sm text-ink-700 shadow-hard-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-2 border-ink-900 accent-coral"
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
                  className="font-bold text-ink-900 underline underline-offset-4"
                >
                  termos de uso
                </Link>
                .
              </span>
            </label>
            {errors.terms && (
              <p className="mt-1.5 text-xs font-semibold text-coral-dark">
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
            className="font-bold text-ink-900 underline underline-offset-4 hover:text-coral-dark"
          >
            Entrar
          </Link>
        </p>
      </Card>
    </AuthPageLayout>
  );
}
