import { Loader2 } from 'lucide-react';
import { env } from '../../config/env';
import { BrandLockup } from '../brand/Brand';

export function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <BrandLockup size="lg" />
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500"
      >
        <Loader2
          className="size-4 animate-spin text-coral"
          aria-hidden="true"
        />
        Carregando {env.appName}...
      </div>
    </main>
  );
}
