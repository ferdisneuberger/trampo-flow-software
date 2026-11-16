import { Cable, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../utils/cn';

type SettingsSection = {
  /** Caminho relativo a `/configuracoes`. */
  to: string;
  label: string;
  icon: LucideIcon;
};

/** Para criar uma seção nova: adicione aqui e uma `<Route>` filha em `App.tsx`. */
const SECTIONS: SettingsSection[] = [{ to: 'mcp', label: 'MCP', icon: Cable }];

export function SettingsPage() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Configurações"
        description="Preferências da conta e integrações."
      />

      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        <nav
          aria-label="Seções de configurações"
          className="md:w-44 md:shrink-0"
        >
          <ul className="flex gap-1 overflow-x-auto border-b border-line pb-2 md:flex-col md:overflow-visible md:border-b-0 md:pb-0">
            {SECTIONS.map(({ to, label, icon: Icon }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-btn px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30',
                      isActive
                        ? 'bg-surface-2 text-fg'
                        : 'text-muted hover:bg-surface-2 hover:text-fg',
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 max-w-3xl flex-1">
          <Outlet />
        </div>
      </div>
    </section>
  );
}
