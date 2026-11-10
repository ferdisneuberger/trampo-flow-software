import {
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  LogOut,
  Search,
} from 'lucide-react';
import { Suspense, useCallback, useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { useLogout } from '../../hooks/useLogout';
import { cn } from '../../utils/cn';
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
  // A barra lateral (lg+) começa recolhida a cada visita.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

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

  // Na barra lateral (lg+) os menus ficam no rodapé e abrem para cima.
  const sidebarMenuClasses =
    'lg:bottom-full lg:left-0 lg:right-auto lg:mb-1 lg:mt-0';
  const collapsed = isSidebarCollapsed;

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-canvas lg:flex-row">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-btn focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-accent"
      >
        Pular para o conteúdo
      </a>

      <header
        className={cn(
          'flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-4 sm:px-6 lg:h-auto lg:flex-col lg:items-stretch lg:gap-1 lg:border-b-0 lg:border-r lg:py-5 lg:transition-[width] lg:duration-200',
          collapsed ? 'lg:w-16 lg:px-2.5' : 'lg:w-[248px] lg:px-3.5',
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center lg:mb-6',
            collapsed ? 'lg:flex-col lg:gap-3' : 'lg:justify-between lg:gap-2',
          )}
        >
          <Link
            to="/candidaturas"
            aria-label="Trampo Flow"
            className={cn(
              'shrink-0 rounded-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30 lg:py-1',
              collapsed ? 'lg:px-1' : 'lg:px-2',
            )}
          >
            <BrandLockup
              size="sm"
              wordmarkClassName={cn(
                'hidden min-[360px]:inline',
                collapsed && 'lg:hidden',
              )}
            />
          </Link>

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            aria-label={
              collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'
            }
            aria-expanded={!collapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="hidden size-8 shrink-0 place-items-center rounded-btn text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30 lg:grid"
          >
            {collapsed ? (
              <ChevronsRight className="size-4" aria-hidden="true" />
            ) : (
              <ChevronsLeft className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleSearchClick}
          aria-label="Abrir busca"
          title={collapsed ? 'Buscar (/)' : undefined}
          className={cn(
            'ml-auto flex size-9 shrink-0 items-center justify-center rounded-btn text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30 md:h-9 md:w-full md:max-w-[420px] md:justify-start md:gap-2.5 md:border md:border-line md:bg-canvas md:px-3 lg:ml-0 lg:max-w-none',
            collapsed &&
              'lg:w-9 lg:self-center lg:justify-center lg:border-transparent lg:bg-transparent lg:px-0',
          )}
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span
            className={cn(
              'hidden min-w-0 flex-1 truncate text-left text-sm md:inline',
              collapsed && 'lg:hidden',
            )}
          >
            Buscar trampo, empresa...
          </span>
          <kbd
            className={cn(
              'hidden rounded border border-line px-1.5 text-[11px] font-medium leading-5 text-muted md:inline',
              collapsed && 'lg:hidden',
            )}
          >
            /
          </kbd>
        </button>

        <nav
          aria-label="Principal"
          className="hidden lg:mt-3 lg:flex lg:flex-col lg:gap-0.5"
        >
          <NavLink
            to="/candidaturas"
            title={collapsed ? 'Candidaturas' : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-btn py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30',
                collapsed ? 'justify-center px-0' : 'px-2.5',
                isActive
                  ? 'bg-surface-2 text-fg'
                  : 'text-muted hover:bg-surface-2 hover:text-fg',
              )
            }
          >
            <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
            <span className={cn(collapsed && 'sr-only')}>Candidaturas</span>
          </NavLink>
        </nav>

        <div
          className={cn(
            'flex shrink-0 items-center gap-1.5 md:ml-auto lg:ml-0 lg:mt-auto lg:border-t lg:border-line lg:pt-4',
            collapsed ? 'lg:flex-col lg:gap-2' : 'lg:justify-between lg:px-1',
          )}
        >
          <Menu
            label={`Menu da conta de ${displayName}`}
            items={accountItems}
            triggerVariant="avatar"
            trigger={<span aria-hidden="true">{initials}</span>}
            menuClassName={cn('w-60', sidebarMenuClasses)}
            className="order-2"
            header={
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-fg">
                  {user?.firstName ?? user?.email ?? 'Sua conta'}
                </p>
                {user?.firstName && (
                  <p className="truncate text-xs text-muted">{user.email}</p>
                )}
              </div>
            }
          />
          <div className={cn('order-1', !collapsed && 'lg:order-3')}>
            <ThemeToggle
              variant="toolbar"
              menuClassName={
                collapsed
                  ? sidebarMenuClasses
                  : 'lg:bottom-full lg:left-auto lg:right-0 lg:mb-1 lg:mt-0'
              }
            />
          </div>
        </div>
      </header>

      <main
        id="conteudo"
        tabIndex={-1}
        className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto px-4 pb-8 pt-5 sm:px-6 md:pt-6 lg:px-8 lg:pt-7"
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
