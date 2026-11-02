import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Paperclip } from 'lucide-react';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type Application,
  type ApplicationStatus,
} from '../../services/applications.types';
import { formatDate } from '../../utils/format';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

type BoardCardProps = {
  application: Application;
  draggingEnabled: boolean;
  onMove: (application: Application, status: ApplicationStatus) => void;
};

export function BoardCard({
  application,
  draggingEnabled,
  onMove,
}: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id, disabled: !draggingEnabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="group rounded-lg border border-line bg-white p-3"
    >
      <div className="flex items-start gap-2">
        {draggingEnabled && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Mover ${application.title}`}
            className="mt-0.5 cursor-grab touch-none rounded p-0.5 text-ink-400 opacity-0 transition hover:text-ink-700 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-ink-900">
            {application.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {application.company}
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-ink-700">
            {application.currentPhase}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <ApplicationStatusBadge status={application.status} />
            <span className="text-[11px] text-ink-400">
              {formatDate(application.updatedAt)}
            </span>
            {application.files.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
                <Paperclip className="size-3" aria-hidden="true" />
                {application.files.length}
              </span>
            )}
          </div>
        </div>

        <details className="relative shrink-0">
          <summary
            aria-label={`Mover ${application.title} para outra coluna`}
            className="grid size-7 cursor-pointer list-none place-items-center rounded text-ink-400 hover:bg-surface hover:text-ink-700"
          >
            ⋯
          </summary>
          <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-line bg-white p-1">
            {APPLICATION_STATUSES.filter(
              (status) => status !== application.status,
            ).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onMove(application, status)}
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-ink-700 hover:bg-surface"
              >
                {APPLICATION_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
