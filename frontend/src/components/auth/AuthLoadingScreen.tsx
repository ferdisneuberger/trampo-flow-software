import { Loader2 } from 'lucide-react';
import { env } from '../../config/env';

export function AuthLoadingScreen() {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 text-sm font-medium text-ink-500"
      >
        <Loader2
          className="size-5 animate-spin text-brand-600"
          aria-hidden="true"
        />
        Carregando {env.appName}...
      </div>
    </div>
  );
}
