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
  PENDING: 'bg-status-pending',
  IN_PROGRESS: 'bg-status-progress',
  COMPLETED: 'bg-status-done',
  REJECTED: 'bg-status-rejected',
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
        'flex h-full min-h-0 flex-col rounded-card border transition-colors',
        isOver ? 'border-line-strong bg-surface-2/70' : 'border-transparent',
      )}
    >
      <header className="mx-1 flex shrink-0 items-center justify-between gap-2 border-b border-line px-1.5 pb-2.5 pt-2">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-normal text-fg">
          <span
            aria-hidden="true"
            className={cn(
              'size-2 shrink-0 rounded-full',
              statusDotClasses[status],
            )}
          />
          <span className="truncate">{APPLICATION_STATUS_LABELS[status]}</span>
        </h2>
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted">
          {total}
        </span>
      </header>

      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-1 pt-2.5">
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
            <p className="rounded-card border border-dashed border-line-strong px-2 py-8 text-center text-[13px] text-muted">
              Nenhuma candidatura
            </p>
          )}

          {hasMore && (
            <p className="px-2 py-1 text-center text-xs text-muted">
              Mostrando as primeiras {items.length} de {total}
            </p>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
