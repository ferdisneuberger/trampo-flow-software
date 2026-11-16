import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { SETTINGS_SECTIONS } from '../config/settings-sections';

/** Início de Configurações: um cartão para cada seção (as mesmas do submenu). */
export function SettingsPage() {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Configurações"
        description="Preferências da conta e integrações."
      />

      <ul aria-label="Seções de configurações" className="grid gap-3">
        {SETTINGS_SECTIONS.map(
          ({ id, label, path, description, icon: Icon }) => (
            <li key={id}>
              <Card className="transition-colors hover:border-line-strong">
                <Link
                  to={path}
                  className="flex items-center gap-3 rounded-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-btn bg-surface-2 text-fg-soft">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-fg">
                      {label}
                    </span>
                    <span className="mt-0.5 block text-sm leading-6 text-muted">
                      {description}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted"
                    aria-hidden="true"
                  />
                </Link>
              </Card>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
