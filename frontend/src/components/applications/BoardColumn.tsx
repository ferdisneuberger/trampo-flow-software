import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  APPLICATION_STATUS_LABELS,
  type Application,
  type ApplicationStatus,
} from '../../services/applications.types';
import { BoardCard } from './BoardCard';

type BoardColumnProps = {
  status: ApplicationStatus;
  total: number;
  items: Application[];
  hasMore: boolean;
  draggingEnabled: boolean;
  onMove: (application: Application, status: ApplicationStatus) => void;
};

export function BoardColumn({
  status,
  total,
  items,
  hasMore,
  draggingEnabled,
  onMove,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });

  return (
    <section
      ref={setNodeRef}
      aria-label={APPLICATION_STATUS_LABELS[status]}
      className={
        isOver
          ? 'flex min-h-[24rem] flex-col rounded-card border border-brand-300 bg-brand-50/40'
          : 'flex min-h-[24rem] flex-col rounded-card border border-line bg-surface/40'
      }
    >
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-700">
          {APPLICATION_STATUS_LABELS[status]}
        </h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-500">
          {total}
        </span>
      </header>

      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2 p-2">
          {items.map((application) => (
            <BoardCard
              key={application.id}
              application={application}
              draggingEnabled={draggingEnabled}
              onMove={onMove}
            />
          ))}

          {items.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-ink-400">
              Nenhuma candidatura
            </p>
          )}

          {hasMore && (
            <p className="px-2 py-1 text-center text-[11px] text-ink-400">
              Mostrando as primeiras {items.length} de {total}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
