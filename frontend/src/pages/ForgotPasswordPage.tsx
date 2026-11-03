import { CheckCircle2, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { authService } from '../services/api/auth.service';
import { getErrorMessage } from '../utils/errors';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (email.trim().length === 0) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await authService.forgotPassword({ email: email.trim().toLowerCase() });
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
            Verifique seu e-mail
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Se houver uma conta com esse e-mail, enviaremos um link para
            redefinir a senha. Confira também a caixa de spam.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Voltar para o login
          </Link>
        </Card>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout tagline="Recupere o acesso à sua conta">
      <Card className="p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">
            Esqueci minha senha
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Informe seu e-mail para receber um link de redefinição.
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

          {error && (
            <Alert
              tone="error"
              title="Não foi possível solicitar"
              description={error}
            />
          )}

          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
            disabled={email.trim().length === 0}
          >
            <Send className="size-4" aria-hidden="true" />
            Enviar link
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Lembrou a senha?{' '}
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
