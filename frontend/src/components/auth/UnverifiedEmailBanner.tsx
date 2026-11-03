import { MailWarning } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/auth-context';
import { authService } from '../../services/api/auth.service';
import { getErrorMessage } from '../../utils/errors';
import { Button } from '../ui/Button';

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function UnverifiedEmailBanner() {
  const { user, refreshProfile } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [overrideAvailableAt, setOverrideAvailableAt] = useState<number | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const availableAt =
    overrideAvailableAt ??
    (user?.verificationResendAvailableAt
      ? new Date(user.verificationResendAvailableAt).getTime()
      : 0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  if (!user || user.emailVerified) {
    return null;
  }

  const remainingSeconds = Math.max(0, Math.ceil((availableAt - now) / 1000));

  async function handleResend() {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const result = await authService.resendVerification();

      setOverrideAvailableAt(Date.now() + result.retryAfterSeconds * 1000);

      if (result.sent) {
        setMessage('Enviamos um novo código para o seu e-mail.');
      }

      void refreshProfile();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <MailWarning className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            Confirme seu e-mail para criar candidaturas
          </p>
          <p className="mt-1 text-sm leading-6">
            Enviamos um código para <strong>{user.email}</strong>. Sua conta não
            será excluída; só falta confirmar o e-mail.
          </p>
          {message && <p className="mt-2 text-sm font-medium">{message}</p>}
          {error && <p className="mt-2 text-sm font-medium">{error}</p>}
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shrink-0"
        onClick={() => void handleResend()}
        disabled={isSubmitting || remainingSeconds > 0}
        isLoading={isSubmitting}
      >
        {remainingSeconds > 0
          ? `Reenviar em ${formatRemaining(remainingSeconds)}`
          : 'Reenviar e-mail'}
      </Button>
    </div>
  );
}
