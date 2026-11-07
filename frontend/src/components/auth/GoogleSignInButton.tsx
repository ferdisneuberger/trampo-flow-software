import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { env } from '../../config/env';
import { useAuth } from '../../contexts/auth-context';
import { ApiError } from '../../services/api/errors';
import {
  loadGoogleIdentity,
  type GoogleCredentialResponse,
} from '../../services/google/google-identity';
import { cn } from '../../utils/cn';
import { getErrorMessage } from '../../utils/errors';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

type GoogleIdentity = Awaited<ReturnType<typeof loadGoogleIdentity>>;

const GOOGLE_BUTTON_MIN_WIDTH = 200;
const GOOGLE_BUTTON_MAX_WIDTH = 400;
const GOOGLE_BUTTON_FALLBACK_WIDTH = 320;

function clampGoogleButtonWidth(width: number): number {
  return Math.min(
    GOOGLE_BUTTON_MAX_WIDTH,
    Math.max(GOOGLE_BUTTON_MIN_WIDTH, Math.round(width)),
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export function GoogleSignInButton() {
  const { loginWithGoogle } = useAuth();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(GOOGLE_BUTTON_FALLBACK_WIDTH);
  const [isReady, setIsReady] = useState(false);
  const [googleIdentity, setGoogleIdentity] = useState<GoogleIdentity | null>(
    null,
  );
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
    const wrapper = wrapperRef.current;

    if (!wrapper) {
      return;
    }

    const updateWidth = () => {
      const nextWidth = clampGoogleButtonWidth(
        wrapper.clientWidth || GOOGLE_BUTTON_FALLBACK_WIDTH,
      );

      setButtonWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(updateWidth);

    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);

  // O callback do Google é registrado uma única vez; o ref garante que ele
  // sempre chame a versão mais recente de `handleCredential`.
  const handleCredentialRef = useRef(handleCredential);

  useEffect(() => {
    handleCredentialRef.current = handleCredential;
  }, [handleCredential]);

  useEffect(() => {
    if (!clientId) {
      return;
    }

    let cancelled = false;

    void loadGoogleIdentity()
      .then((google) => {
        if (cancelled) {
          return;
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: GoogleCredentialResponse) => {
            if (response.credential) {
              void handleCredentialRef.current(response.credential, false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        setGoogleIdentity(google);
      })
      .catch(() => {
        if (!cancelled) {
          setIsReady(false);
          setError('Não foi possível carregar o login do Google.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // Mudanças de largura só redesenham o botão, sem chamar `initialize` de novo.
  useEffect(() => {
    const container = containerRef.current;

    if (!googleIdentity || !container) {
      return;
    }

    container.replaceChildren();
    googleIdentity.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: buttonWidth,
      locale: 'pt-BR',
    });
    setIsReady(true);
  }, [googleIdentity, buttonWidth]);

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
      <div
        ref={wrapperRef}
        className="group relative w-full rounded-btn focus-within:ring-4 focus-within:ring-cobalt/20 focus-within:ring-offset-2 focus-within:ring-offset-cream"
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none flex h-10 w-full items-center justify-center gap-2 rounded-btn border-2 border-ink-900 bg-surface px-4 text-sm font-bold text-ink-900 shadow-hard-sm transition',
            'group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-surface-raised group-hover:shadow-hard',
            'group-active:translate-x-0 group-active:translate-y-0 group-active:shadow-hard-sm',
            !isReady && 'opacity-60',
          )}
        >
          <GoogleIcon />
          Continuar com Google
        </span>

        <div
          ref={containerRef}
          className="absolute inset-0 z-10 overflow-hidden rounded-btn opacity-0"
        />
      </div>

      {isSubmitting && (
        <p
          role="status"
          className="mt-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink-500"
        >
          Conectando com o Google...
        </p>
      )}

      {needsTerms && (
        <div className="mt-4 rounded-xl border-2 border-ink-900 bg-surface p-4 text-sm shadow-hard-sm">
          <p className="font-bold text-ink-900">
            Falta aceitar os termos para criar sua conta.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-3 text-ink-700">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-2 border-ink-900 accent-coral"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
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

      <div className="my-6 flex items-center gap-3">
        <span className="h-0 flex-1 border-t-2 border-dashed border-ink-900/20" />
        <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-ink-500">
          ou
        </span>
        <span className="h-0 flex-1 border-t-2 border-dashed border-ink-900/20" />
      </div>
    </div>
  );
}
