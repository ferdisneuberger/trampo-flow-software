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
  triggerVariant?: 'default' | 'toolbar' | 'avatar';
  menuClassName?: string;
  header?: ReactNode;
};

export function Menu({
  label,
  items,
  className,
  trigger,
  triggerVariant = 'default',
  menuClassName,
  header,
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
          'grid cursor-pointer list-none place-items-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30',
          triggerVariant === 'avatar'
            ? 'size-9 rounded-full border-line bg-surface-2 text-xs font-semibold text-fg hover:border-line-strong'
            : triggerVariant === 'toolbar'
              ? 'size-9 rounded-btn border-transparent text-muted hover:bg-surface-2 hover:text-fg'
              : 'size-7 rounded-md border-transparent text-muted hover:bg-surface-2 hover:text-fg',
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
            'absolute right-0 z-20 mt-1 w-52 rounded-btn border border-line bg-surface p-1 shadow-pop',
            menuClassName,
          )}
        >
          {header && (
            <div className="border-b border-line px-2 py-1.5">{header}</div>
          )}

          {items.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.id} role="none">
                {item.separatorBefore && (
                  <div className="my-1 border-t border-line" role="separator" />
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
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium transition-colors',
                    item.tone === 'danger'
                      ? 'text-danger hover:bg-danger-soft'
                      : 'text-fg-soft hover:bg-surface-2 hover:text-fg',
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
