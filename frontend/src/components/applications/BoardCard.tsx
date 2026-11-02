import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Paperclip } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type Application,
  type ApplicationStatus,
} from '../../services/applications.types';
import { formatDate } from '../../utils/format';
import { Menu, type MenuItem } from '../ui/Menu';

type BoardCardProps = {
  application: Application;
  draggingEnabled: boolean;
  onMove: (application: Application, status: ApplicationStatus) => void;
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void;
};

export function BoardCard({
  application,
  draggingEnabled,
  onMove,
  onEdit,
  onDelete,
}: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id, disabled: !draggingEnabled });

  const menuItems: MenuItem[] = [
    {
      id: 'edit',
      label: 'Editar candidatura',
      onSelect: () => onEdit(application),
    },
    {
      id: 'delete',
      label: 'Excluir candidatura',
      tone: 'danger',
      onSelect: () => onDelete(application),
    },
    ...APPLICATION_STATUSES.filter(
      (status) => status !== application.status,
    ).map((status, index) => ({
      id: `move-${status}`,
      label: `Mover para: ${APPLICATION_STATUS_LABELS[status]}`,
      separatorBefore: index === 0,
      onSelect: () => onMove(application, status),
    })),
  ];

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
            className="mt-0.5 cursor-grab touch-none rounded p-0.5 text-ink-500 opacity-0 transition hover:text-ink-700 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <Link
            to={`/candidaturas/${application.id}`}
            className="line-clamp-2 text-sm font-semibold text-ink-900 underline-offset-4 hover:text-brand-700 hover:underline"
          >
            {application.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {application.company}
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-ink-700">
            {application.currentPhase}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] text-ink-500">
              {formatDate(application.updatedAt)}
            </span>
            {application.files.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
                <Paperclip className="size-3" aria-hidden="true" />
                {application.files.length}
              </span>
            )}
          </div>
        </div>

        <Menu
          label={`Ações de ${application.title}`}
          items={menuItems}
          className="shrink-0"
        />
      </div>
    </div>
  );
}
