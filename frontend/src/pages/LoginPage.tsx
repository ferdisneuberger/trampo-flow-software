import { LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AuthLoadingScreen } from '../components/auth/AuthLoadingScreen';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/auth-context';
import { getErrorMessage } from '../utils/errors';
import { safeRedirectPath } from '../utils/url';

export function LoginPage() {
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestedPath = (location.state as { from?: unknown } | null)?.from;
  const redirectTo = safeRedirectPath(requestedPath) ?? '/candidaturas';
  const needsEmailVerification = user?.emailVerified === false;

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to={needsEmailVerification ? '/verificar-email' : redirectTo}
        state={needsEmailVerification ? { from: redirectTo } : undefined}
        replace
      />
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (email.trim().length === 0 || password.length === 0) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageLayout>
      <Card className="p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">
            Entrar na sua conta
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Entre com seu e-mail e senha.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(event) => void handleSubmit(event)}
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
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
          />

          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            maxLength={256}
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
          />

          <div className="flex justify-end">
            <Link
              to="/esqueci-senha"
              className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>

          {error && (
            <Alert
              tone="error"
              title="Não foi possível entrar"
              description={error}
            />
          )}

          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
            disabled={email.trim().length === 0 || password.length === 0}
          >
            <LogIn className="size-4" aria-hidden="true" />
            Entrar
          </Button>
        </form>

        <GoogleSignInButton />

        <p className="mt-6 text-center text-sm text-ink-500">
          Ainda não tem conta?{' '}
          <Link
            to="/cadastro"
            className="font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </Card>
    </AuthPageLayout>
  );
}
