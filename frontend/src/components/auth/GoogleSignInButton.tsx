import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { env } from '../../config/env';
import { useAuth } from '../../contexts/auth-context';
import { ApiError } from '../../services/api/errors';
import {
  loadGoogleIdentity,
  type GoogleCredentialResponse,
} from '../../services/google/google-identity';
import { getErrorMessage } from '../../utils/errors';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

export function GoogleSignInButton() {
  const { loginWithGoogle } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [needsTerms, setNeedsTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pendingCredential, setPendingCredential] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredential = useCallback(
    async (credential: string, termsAccepted: boolean) => {
      setError(null);
      setIsSubmitting(true);

      try {
        await loginWithGoogle({ credential, termsAccepted });
      } catch (requestError) {
        if (
          requestError instanceof ApiError &&
          requestError.code === 'TERMS_REQUIRED'
        ) {
          setPendingCredential(credential);
          setAcceptedTerms(false);
          setNeedsTerms(true);
          return;
        }

        setError(getErrorMessage(requestError));
      } finally {
        setIsSubmitting(false);
      }
    },
    [loginWithGoogle],
  );

  const clientId = env.googleClientId;

  useEffect(() => {
    if (!clientId || !containerRef.current) {
      return;
    }

    let cancelled = false;

    void loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: GoogleCredentialResponse) => {
            if (response.credential) {
              void handleCredential(response.credential, false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 320,
          locale: 'pt-BR',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError('Não foi possível carregar o login do Google.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, handleCredential]);

  if (!env.googleClientId) {
    return null;
  }

  function acceptTerms() {
    if (!pendingCredential) {
      return;
    }

    setNeedsTerms(false);
    void handleCredential(pendingCredential, true);
  }

  return (
    <div>
      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-medium uppercase tracking-wide text-ink-500">
          ou
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div ref={containerRef} className="flex justify-center" />

      {isSubmitting && (
        <p role="status" className="mt-3 text-center text-sm text-ink-500">
          Conectando com o Google...
        </p>
      )}

      {needsTerms && (
        <div className="mt-4 rounded-xl border border-line bg-surface p-4 text-sm">
          <p className="font-medium text-ink-900">
            Falta aceitar os termos para criar sua conta.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-3 text-ink-700">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-line accent-brand-600"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
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
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={acceptTerms}
              disabled={!acceptedTerms || isSubmitting}
            >
              Continuar com Google
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setNeedsTerms(false);
                setPendingCredential(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <Alert
            tone="error"
            title="Não foi possível entrar com o Google"
            description={error}
          />
        </div>
      )}
    </div>
  );
}
