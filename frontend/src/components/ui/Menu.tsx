import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

export type MenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  separatorBefore?: boolean;
};

type MenuProps = {
  label: string;
  items: MenuItem[];
  className?: string;
};

export function Menu({ label, items, className }: MenuProps) {
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
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

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
        className="grid size-7 cursor-pointer list-none place-items-center rounded text-ink-500 transition hover:bg-surface hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        <span aria-hidden="true" className="text-base leading-none">
          ⋯
        </span>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            'absolute right-0 z-20 mt-1 w-44 rounded-lg border border-line bg-white p-1 shadow-lg',
          )}
        >
          {items.map((item) => (
            <div key={item.id} role="none">
              {item.separatorBefore && (
                <div className="my-1 border-t border-line" role="separator" />
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => handleSelect(item)}
                className={cn(
                  'block w-full rounded px-2 py-1.5 text-left text-xs transition',
                  item.tone === 'danger'
                    ? 'text-rose-700 hover:bg-rose-50'
                    : 'text-ink-700 hover:bg-surface',
                )}
              >
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
