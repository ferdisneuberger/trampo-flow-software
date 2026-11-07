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
          <span className="mx-auto grid size-16 place-items-center rounded-xl border-2 border-ink-900 bg-success-soft text-ink-900 shadow-hard-sm">
            <CheckCircle2 className="size-8" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-extrabold tracking-[-0.06em] text-ink-900">
            Verifique seu e-mail
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Se houver uma conta com esse e-mail, enviaremos um link para
            redefinir a senha. Confira também a caixa de spam.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-ink-900 underline underline-offset-4 hover:text-coral-dark"
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
          <span className="grid size-12 place-items-center rounded-xl border-2 border-ink-900 bg-yellow text-on-accent shadow-hard-sm">
            <Send className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.06em] text-ink-900">
            Esqueci minha senha
          </h1>
          <p className="mt-1 text-sm leading-6 text-ink-500">
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
            className="font-bold text-ink-900 underline underline-offset-4 hover:text-coral-dark"
          >
            Entrar
          </Link>
        </p>
      </Card>
    </AuthPageLayout>
  );
}
