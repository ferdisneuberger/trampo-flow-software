import { Check, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type MenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  separatorBefore?: boolean;
  icon?: LucideIcon;
  checked?: boolean;
};

type MenuProps = {
  label: string;
  items: MenuItem[];
  className?: string;
  trigger?: ReactNode;
  triggerVariant?: 'default' | 'sidebar' | 'toolbar';
  menuClassName?: string;
};

export function Menu({
  label,
  items,
  className,
  trigger,
  triggerVariant = 'default',
  menuClassName,
}: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (item: MenuItem) => {
    setIsOpen(false);
    triggerRef.current?.focus();
    item.onSelect();
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={label}
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          'grid cursor-pointer list-none place-items-center rounded-md border-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt/20',
          triggerVariant === 'sidebar'
            ? 'size-8 border-sidebar-border bg-sidebar-hover text-sidebar-ink hover:bg-surface/20'
            : triggerVariant === 'toolbar'
              ? 'size-10 border-ink-900 bg-surface text-ink-900 shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-surface-raised hover:shadow-hard'
              : 'size-7 border-transparent text-ink-500 hover:border-ink-900 hover:bg-surface hover:text-ink-900',
        )}
      >
        {trigger ?? (
          <span aria-hidden="true" className="text-base leading-none">
            ⋯
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            'absolute right-0 z-20 mt-1 w-48 rounded-lg border-2 border-ink-900 bg-surface p-1 shadow-hard',
            menuClassName,
          )}
        >
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.id} role="none">
                {item.separatorBefore && (
                  <div
                    className="my-1 border-t-2 border-ink-900/20"
                    role="separator"
                  />
                )}
                <button
                  type="button"
                  role={
                    item.checked === undefined ? 'menuitem' : 'menuitemradio'
                  }
                  aria-checked={
                    item.checked === undefined ? undefined : item.checked
                  }
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-semibold transition',
                    item.tone === 'danger'
                      ? 'text-coral-dark hover:bg-coral/10'
                      : 'text-ink-700 hover:bg-accent-soft hover:text-ink-900',
                  )}
                >
                  {Icon && (
                    <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.checked && (
                    <Check className="size-3.5 shrink-0" aria-hidden="true" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
