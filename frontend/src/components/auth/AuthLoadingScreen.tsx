import { Loader2 } from 'lucide-react';
import { env } from '../../config/env';
import { BrandLockup } from '../brand/Brand';

export function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <BrandLockup size="md" />
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 text-[13px] text-muted"
      >
        <Loader2
          className="size-4 animate-spin text-muted"
          aria-hidden="true"
        />
        Carregando {env.appName}...
      </div>
    </main>
  );
}
