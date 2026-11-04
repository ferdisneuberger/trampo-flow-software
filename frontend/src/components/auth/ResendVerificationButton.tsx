import { MailCheck } from 'lucide-react';
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

type ResendVerificationButtonProps = {
  className?: string;
};

export function ResendVerificationButton({
  className,
}: ResendVerificationButtonProps) {
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

  const remainingSeconds = Math.max(0, Math.ceil((availableAt - now) / 1000));

  async function handleResend() {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const result = await authService.resendVerification();

      setOverrideAvailableAt(Date.now() + result.retryAfterSeconds * 1000);

      if (result.sent) {
        setMessage('Enviamos um novo e-mail de verificação.');
      }

      void refreshProfile();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => void handleResend()}
        disabled={isSubmitting || remainingSeconds > 0}
        isLoading={isSubmitting}
      >
        <MailCheck className="size-4" aria-hidden="true" />
        {remainingSeconds > 0
          ? `Reenviar em ${formatRemaining(remainingSeconds)}`
          : 'Reenviar e-mail de verificação'}
      </Button>
      {message && (
        <p className="mt-2 text-sm font-medium text-emerald-700">{message}</p>
      )}
      {error && (
        <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>
      )}
    </div>
  );
}
