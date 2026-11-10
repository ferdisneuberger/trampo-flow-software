import { CheckCircle2, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
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
        <div>
          <span className="grid size-12 place-items-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-[28px] font-semibold leading-tight text-fg">
            Verifique seu e-mail
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-muted">
            Se houver uma conta com esse e-mail, enviaremos um link para
            redefinir a senha. Confira também a caixa de spam.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block text-sm font-medium text-fg underline underline-offset-4 hover:text-fg-soft"
          >
            Voltar para o login
          </Link>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout tagline="Recupere o acesso à sua conta">
      <div>
        <div className="mb-7">
          <h1 className="font-display text-[28px] font-semibold leading-tight text-fg">
            Esqueci minha senha
          </h1>
          <p className="mt-2 text-[15px] leading-6 text-muted">
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

        <p className="mt-6 text-sm text-muted">
          Lembrou a senha?{' '}
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
