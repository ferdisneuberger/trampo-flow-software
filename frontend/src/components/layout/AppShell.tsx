import { Briefcase, LogOut } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { env } from '../../config/env';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';

const navItems = [{ to: '/', label: 'Candidaturas' }] as const;

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <NavLink
            to="/"
            className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
              <Briefcase className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-semibold leading-tight tracking-tight text-ink-900">
                {env.appName}
              </span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-ink-400">
                Gestão de candidaturas
              </span>
            </span>
          </NavLink>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <nav
              className="flex items-center gap-1"
              aria-label="Navegação principal"
            >
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-2 py-2 text-sm font-medium transition sm:px-3',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-ink-500 hover:bg-surface hover:text-ink-900',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <span
              className="hidden h-6 w-px bg-line sm:block"
              aria-hidden="true"
            />
            <span className="hidden max-w-40 truncate text-sm font-medium text-ink-500 sm:block">
              {user?.username}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              aria-label="Sair da conta"
              title="Sair da conta"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Outlet />
      </main>

      <footer className="border-t border-line/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>{env.appName} — organize suas candidaturas em um só lugar.</p>
          <p>React · Vite · TypeScript · Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}
