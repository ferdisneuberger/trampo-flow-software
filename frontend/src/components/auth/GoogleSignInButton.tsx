import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { env } from '../../config/env';
import { useAuth } from '../../contexts/auth-context';
import { useTheme } from '../../contexts/theme-context';
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

export function GoogleSignInButton() {
  const { loginWithGoogle } = useAuth();
  const { resolvedTheme } = useTheme();
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
      theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: buttonWidth,
      locale: 'pt-BR',
    });
    setIsReady(true);
  }, [googleIdentity, buttonWidth, resolvedTheme]);

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
      {/* Botão oficial do Google (iframe), visível e sem nada por cima. */}
      <div ref={wrapperRef} className="w-full">
        <div
          ref={containerRef}
          className={cn(
            'flex min-h-10 w-full justify-center',
            !isReady && 'animate-pulse rounded-btn bg-surface-2',
          )}
        />
      </div>

      {isSubmitting && (
        <p role="status" className="mt-3 text-center text-[13px] text-muted">
          Conectando com o Google...
        </p>
      )}

      {needsTerms && (
        <div className="mt-4 rounded-card border border-line bg-surface-2 p-4 text-sm">
          <p className="font-semibold text-fg">
            Falta aceitar os termos para criar sua conta.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-3 text-fg-soft">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border border-line accent-fg"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
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
        <span className="h-px flex-1 bg-line" />
        <span className="text-[13px] text-muted">ou</span>
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
