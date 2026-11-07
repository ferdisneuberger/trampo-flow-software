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
import { cn } from '../../utils/cn';
import { BoardCard } from './BoardCard';

type BoardColumnProps = {
  status: ApplicationStatus;
  total: number;
  items: Application[];
  hasMore: boolean;
  draggingEnabled: boolean;
  onMove: (application: Application, status: ApplicationStatus) => void;
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void;
};

const statusDotClasses: Record<ApplicationStatus, string> = {
  PENDING: 'bg-yellow',
  IN_PROGRESS: 'bg-cobalt',
  COMPLETED: 'bg-green',
  REJECTED: 'bg-coral',
};

export function BoardColumn({
  status,
  total,
  items,
  hasMore,
  draggingEnabled,
  onMove,
  onEdit,
  onDelete,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });

  return (
    <section
      ref={setNodeRef}
      aria-label={APPLICATION_STATUS_LABELS[status]}
      className={cn(
        'flex h-full min-h-0 flex-col rounded-card border-2 border-ink-900 shadow-hard-sm transition',
        isOver ? 'bg-accent-soft' : 'bg-column',
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-ink-900 px-3.5 py-3">
        <h2 className="flex min-w-0 items-center gap-2 font-display text-sm font-bold tracking-[-0.02em] text-ink-900">
          <span
            aria-hidden="true"
            className={cn(
              'size-2.5 shrink-0 rounded-full border border-ink-900',
              statusDotClasses[status],
            )}
          />
          <span className="truncate">{APPLICATION_STATUS_LABELS[status]}</span>
        </h2>
        <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink-900 bg-solid font-mono text-[10px] font-bold text-on-solid">
          {total}
        </span>
      </header>

      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
          {items.map((application) => (
            <BoardCard
              key={application.id}
              application={application}
              draggingEnabled={draggingEnabled}
              onMove={onMove}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}

          {items.length === 0 && (
            <p className="px-2 py-8 text-center font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-ink-500">
              Nenhuma candidatura
            </p>
          )}

          {hasMore && (
            <p className="px-2 py-1 text-center font-mono text-[9px] text-ink-500">
              Mostrando as primeiras {items.length} de {total}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
