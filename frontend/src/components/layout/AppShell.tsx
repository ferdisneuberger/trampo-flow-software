import {
  Bell,
  Compass,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  X,
} from 'lucide-react';
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { useLogout } from '../../hooks/useLogout';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cn } from '../../utils/cn';
import { BrandLockup } from '../brand/Brand';
import { ErrorBoundary } from '../ui/ErrorBoundary';
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

function focusElement(ref: RefObject<HTMLElement | null>) {
  ref.current?.focus({ preventScroll: true });
}

export function AppShell() {
  const { user } = useAuth();
  const { logout, isPending } = useLogout();
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarCloseRef = useRef<HTMLButtonElement>(null);

  const displayName = user?.firstName?.trim() || user?.email || 'Você';
  const initials = getInitials(
    user?.firstName ?? undefined,
    user?.lastName ?? undefined,
    user?.email,
  );
  const sidebarVisible = isDesktop || isSidebarOpen;

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
    queueMicrotask(() => focusElement(sidebarCloseRef));
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    queueMicrotask(() => focusElement(menuButtonRef));
  }, []);

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSidebar();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeSidebar, isSidebarOpen]);

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

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-cream">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border-2 focus:border-ink-900 focus:bg-yellow focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:font-bold focus:uppercase focus:tracking-[0.1em] focus:text-on-accent focus:shadow-hard-sm"
      >
        Pular para o conteúdo
      </a>

      {isSidebarOpen && (
        <div
          aria-hidden="true"
          onClick={closeSidebar}
          className="fixed inset-0 z-30 bg-overlay backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        aria-label="Menu principal"
        aria-hidden={!sidebarVisible}
        inert={!sidebarVisible}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[280px] shrink-0 flex-col border-r-2 border-sidebar-border bg-sidebar px-4 py-6 transition-transform duration-200 md:static md:z-auto md:h-full md:w-[272px] md:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <NavLink
            to="/candidaturas"
            onClick={closeSidebar}
            className="min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt/20"
          >
            <BrandLockup />
          </NavLink>
          <button
            ref={sidebarCloseRef}
            type="button"
            onClick={closeSidebar}
            aria-label="Fechar menu"
            className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-sidebar-border bg-sidebar-hover text-sidebar-ink transition hover:bg-surface/20 md:hidden"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <p className="ml-[50px] mt-2 font-mono text-[8.5px] font-bold uppercase tracking-[0.08em] text-sidebar-muted">
          Meus trampos, num só lugar
        </p>

        <p className="mt-8 font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-sidebar-muted">
          Meu espaço
        </p>
        <nav className="mt-2 flex flex-col gap-1" aria-label="Principal">
          <NavLink
            to="/candidaturas"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition',
                isActive
                  ? 'bg-solid text-on-solid shadow-[3px_3px_0_var(--color-shadow)]'
                  : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink',
              )
            }
          >
            <LayoutGrid className="size-4" aria-hidden="true" />
            Candidaturas
          </NavLink>
        </nav>

        <div className="mt-auto pt-6">
          <div className="rounded-xl border-2 border-sidebar-border bg-tip-bg p-4 text-tip-text shadow-hard">
            <div className="flex items-center gap-2 font-mono text-[8.5px] font-bold uppercase tracking-[0.1em] text-yellow">
              <Compass className="size-4" aria-hidden="true" />
              Dica do trampo
            </div>
            <p className="mt-3 font-display text-lg font-bold leading-tight">
              Arrasta pra lá
            </p>
            <p className="mt-1.5 text-xs leading-5 text-tip-muted">
              Cada coluna é uma etapa da sua busca. Move os cards conforme a
              conversa avança — sem planilha, sem drama.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t-2 border-sidebar-border/60 pt-4">
            <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-sidebar-muted">
              Tema
            </span>
            <ThemeToggle variant="sidebar" />
          </div>

          <div className="mt-3 flex items-center gap-3 border-t-2 border-sidebar-border/60 pt-4">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-sidebar-border bg-coral font-display text-xs font-bold text-on-coral"
            >
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-sidebar-ink">
                {user?.firstName ?? user?.email}
              </p>
              {user?.firstName && (
                <p className="truncate text-[11px] text-sidebar-muted">
                  {user.email}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              disabled={isPending}
              aria-label="Sair"
              className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-sidebar-border bg-sidebar-hover text-sidebar-ink transition hover:bg-surface/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-3 px-4 pb-1 pt-4 md:flex-row md:items-center md:gap-4 md:px-6 md:py-4">
          <div className="flex items-center justify-between gap-2 md:hidden">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={openSidebar}
              aria-label="Abrir menu"
              aria-expanded={isSidebarOpen}
              aria-controls="app-sidebar"
              className="grid size-10 place-items-center rounded-lg border-2 border-ink-900 bg-surface text-ink-900 shadow-hard-sm"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-1.5">
              <ThemeToggle variant="toolbar" />
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center text-ink-900"
              >
                <Bell className="size-5" />
              </span>
              <span
                role="img"
                aria-label={`Perfil de ${displayName}`}
                className="grid size-10 place-items-center rounded-full border-2 border-ink-900 bg-coral font-display text-xs font-bold text-on-coral shadow-hard-sm"
              >
                {initials}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSearchClick}
            className="flex h-11 w-full items-center gap-3 rounded-lg border-2 border-ink-900 bg-surface px-3 text-left shadow-hard-sm transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard md:max-w-[560px]"
          >
            <Search
              className="size-4 shrink-0 text-ink-900"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-sm text-ink-500">
              Buscar trampo, empresa...
            </span>
            <kbd
              aria-hidden="true"
              className="hidden rounded border border-ink-900 bg-yellow px-1.5 py-0.5 font-mono text-[10px] font-bold text-on-accent sm:inline"
            >
              /
            </kbd>
          </button>

          <div className="hidden md:ml-auto md:flex md:items-center md:gap-3">
            <ThemeToggle variant="toolbar" />
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center text-ink-900"
            >
              <Bell className="size-5" />
            </span>
            <span
              role="img"
              aria-label={`Perfil de ${displayName}`}
              className="grid size-10 place-items-center rounded-full border-2 border-ink-900 bg-coral font-display text-xs font-bold text-on-coral shadow-hard-sm"
            >
              {initials}
            </span>
          </div>
        </header>

        <main
          id="conteudo"
          tabIndex={-1}
          className="mx-auto flex min-h-0 w-full max-w-[100rem] flex-1 flex-col overflow-y-auto px-4 pb-10 pt-4 sm:px-6 md:pt-2 lg:px-8"
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
