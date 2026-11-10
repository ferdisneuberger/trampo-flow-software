import { CheckCircle2, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { PasswordRequirements } from '../components/auth/PasswordRequirements';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { ButtonLink } from '../components/ui/ButtonLink';
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
        <div>
          <span className="grid size-12 place-items-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-[28px] font-semibold leading-tight text-fg">
            Cadastro recebido
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-muted">
            Enviamos um código de verificação para{' '}
            <strong className="font-semibold text-fg">
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
              className="text-sm font-medium text-fg underline underline-offset-4 hover:text-fg-soft"
            >
              Voltar para o login
            </Link>
          </div>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout tagline="Crie sua conta para começar">
      <div>
        <div className="mb-7">
          <h1 className="font-display text-[28px] font-semibold leading-tight text-fg">
            Criar conta
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-muted">
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
            <label className="flex cursor-pointer items-start gap-3 rounded-btn border border-line bg-surface-2 p-3.5 text-sm text-fg-soft">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border border-line accent-fg"
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
                  className="font-semibold text-fg underline underline-offset-4"
                >
                  termos de uso
                </Link>
                .
              </span>
            </label>
            {errors.terms && (
              <p className="mt-1.5 text-xs font-medium text-danger">
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

        <p className="mt-6 text-sm text-muted">
          Já tem conta?{' '}
          <Link
            to="/login"
            className="font-semibold text-fg underline underline-offset-4 hover:text-fg-soft"
          >
            Entrar
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
}
