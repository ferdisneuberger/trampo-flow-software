import { LogOut, Search } from 'lucide-react';
import { Suspense, useCallback, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { useLogout } from '../../hooks/useLogout';
import { BrandLockup } from '../brand/Brand';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Menu, type MenuItem } from '../ui/Menu';
import { Skeleton } from '../ui/Skeleton';
import { ThemeToggle } from '../ui/ThemeToggle';

function getInitials(firstName?: string, lastName?: string, email?: string) {
  const fromName = [firstName?.[0], lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase();

  if (fromName) {
    return fromName;
  }

  return email?.slice(0, 2).toUpperCase() || 'TF';
}

export function AppShell() {
  const { user } = useAuth();
  const { logout } = useLogout();
  const location = useLocation();
  const navigate = useNavigate();

  const displayName = user?.firstName?.trim() || user?.email || 'Você';
  const initials = getInitials(
    user?.firstName ?? undefined,
    user?.lastName ?? undefined,
    user?.email,
  );

  const focusBoardSearch = useCallback(() => {
    const input = document.getElementById('board-search');

    if (input instanceof HTMLInputElement) {
      window.dispatchEvent(new CustomEvent('trampo-flow:focus-search'));

      return true;
    }

    return false;
  }, []);

  const handleSearchClick = useCallback(() => {
    if (focusBoardSearch()) {
      return;
    }

    void navigate('/candidaturas?focus=search');
  }, [focusBoardSearch, navigate]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.key !== '/'
      ) {
        return;
      }

      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLElement &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          active.isContentEditable);

      if (isTyping) {
        return;
      }

      event.preventDefault();
      handleSearchClick();
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSearchClick]);

  const accountItems: MenuItem[] = [
    {
      id: 'logout',
      label: 'Sair',
      icon: LogOut,
      tone: 'danger',
      onSelect: () => {
        void logout();
      },
    },
  ];

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-cream">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border-2 focus:border-ink-900 focus:bg-yellow focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:font-bold focus:uppercase focus:tracking-[0.1em] focus:text-on-accent focus:shadow-hard-sm"
      >
        Pular para o conteúdo
      </a>

      <header className="shrink-0 border-b-2 border-ink-900 bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-[100rem] items-center gap-2 px-4 sm:h-[72px] sm:gap-3 sm:px-6 lg:px-8">
          <Link
            to="/candidaturas"
            aria-label="Trampo Flow"
            className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt/20"
          >
            <BrandLockup
              size="sm"
              wordmarkClassName="hidden min-[360px]:inline"
            />
          </Link>

          <button
            type="button"
            onClick={handleSearchClick}
            aria-label="Abrir busca"
            className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-lg border-2 border-ink-900 bg-surface text-ink-900 shadow-hard-sm transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-surface-raised hover:shadow-hard md:ml-6 md:h-11 md:w-full md:max-w-[560px] md:justify-start md:gap-3 md:px-3"
          >
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden min-w-0 flex-1 truncate text-left text-sm text-ink-500 sm:inline">
              Buscar trampo, empresa...
            </span>
            <kbd className="hidden rounded border border-ink-900 bg-yellow px-1.5 py-0.5 font-mono text-[10px] font-bold text-on-accent sm:inline">
              /
            </kbd>
          </button>

          <div className="flex shrink-0 items-center gap-2 md:ml-auto">
            <ThemeToggle variant="toolbar" />
            <Menu
              label={`Menu da conta de ${displayName}`}
              items={accountItems}
              triggerVariant="avatar"
              trigger={<span aria-hidden="true">{initials}</span>}
              menuClassName="w-60"
              header={
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-ink-900">
                    {user?.firstName ?? user?.email ?? 'Sua conta'}
                  </p>
                  {user?.firstName && (
                    <p className="truncate text-[10px] text-ink-500">
                      {user.email}
                    </p>
                  )}
                </div>
              }
            />
          </div>
        </div>
      </header>

      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto flex min-h-0 w-full max-w-[100rem] flex-1 flex-col overflow-y-auto px-4 pb-10 pt-5 sm:px-6 md:pt-6 lg:px-8"
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
  );
}
