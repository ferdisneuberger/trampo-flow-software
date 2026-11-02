import { Briefcase, LogOut } from 'lucide-react';
import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { env } from '../../config/env';
import { useAuth } from '../../contexts/auth-context';
import { useLogout } from '../../hooks/useLogout';
import { cn } from '../../utils/cn';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Skeleton } from '../ui/Skeleton';

const navItems = [
  { to: '/candidaturas', label: 'Candidaturas', icon: Briefcase },
] as const;

export function AppShell() {
  const { user } = useAuth();
  const { logout, isPending } = useLogout();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-bg">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-700 focus:shadow"
      >
        Pular para o conteúdo
      </a>

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-6 md:flex">
        <NavLink
          to="/candidaturas"
          className="flex items-center gap-2.5 rounded-xl px-2 py-1"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
            <Briefcase className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-tight tracking-tight text-ink-900">
              {env.appName}
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500">
              Candidaturas
            </span>
          </span>
        </NavLink>

        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Principal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
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
            onClick={() => void logout()}
            disabled={isPending}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-surface hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 md:hidden">
          <NavLink
            to="/candidaturas"
            className="text-sm font-semibold text-ink-900"
          >
            {env.appName}
          </NavLink>
          <nav className="flex items-center gap-1" aria-label="Principal">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-xs font-semibold transition',
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
              onClick={() => void logout()}
              disabled={isPending}
              aria-label="Sair da conta"
              className="rounded-lg p-2.5 text-ink-500 transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </nav>
        </header>

        <main
          id="conteudo"
          tabIndex={-1}
          className="mx-auto w-full max-w-[100rem] flex-1 px-4 py-6 sm:px-6 lg:px-8"
        >
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense
              fallback={
                <div
                  role="status"
                  aria-label="Carregando página"
                  className="space-y-3"
                >
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-64 rounded-card" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
