import { Briefcase, Lock, LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthLoadingScreen } from '../components/auth/AuthLoadingScreen';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { env } from '../config/env';
import { useAuth } from '../contexts/auth-context';
import { getErrorMessage } from '../utils/errors';
import { safeRedirectPath } from '../utils/url';

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestedPath = (location.state as { from?: unknown } | null)?.from;
  const redirectTo = safeRedirectPath(requestedPath) ?? '/candidaturas';

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (username.trim().length === 0 || password.length === 0) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login({ username: username.trim(), password });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-600 text-white">
            <Briefcase className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink-900">
            {env.appName}
          </h1>
          <p className="mt-1 text-sm text-ink-500">Gestão de candidaturas</p>
        </div>

        <Card className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold tracking-tight text-ink-900">
              Entrar na sua conta
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Use as credenciais configuradas no servidor.
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <Input
              label="Usuário"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setError(null);
              }}
            />

            <Input
              label="Senha"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
            />

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
              disabled={username.trim().length === 0 || password.length === 0}
            >
              <LogIn className="size-4" aria-hidden="true" />
              Entrar
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-xs leading-5 text-ink-500">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <p>Acesso restrito.</p>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-ink-500">
          {env.appName} · ambiente privado
        </p>
      </div>
    </div>
  );
}
