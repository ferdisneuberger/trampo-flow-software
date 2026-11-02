import { Briefcase, LogOut, UserRound } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { env } from '../../config/env';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

const navItems = [
  { to: '/candidaturas', label: 'Candidaturas', icon: Briefcase },
  { to: '/conta', label: 'Conta', icon: UserRound },
] as const;

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-6 md:flex">
        <div className="flex items-center gap-2.5 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
            <Briefcase className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-tight tracking-tight text-ink-900">
              {env.appName}
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-ink-400">
              Candidaturas
            </span>
          </span>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Principal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-700 hover:bg-surface hover:text-ink-900',
                )
              }
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 border-t border-line pt-4">
          <p className="truncate px-3 text-xs font-medium text-ink-700">
            {user?.username}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-surface hover:text-ink-900"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 md:hidden">
          <span className="text-sm font-semibold text-ink-900">
            {env.appName}
          </span>
          <nav className="flex items-center gap-1" aria-label="Principal">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-xs font-semibold transition',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-500 hover:bg-surface',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sair da conta"
              className="rounded-lg p-2 text-ink-500 transition hover:bg-surface"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
