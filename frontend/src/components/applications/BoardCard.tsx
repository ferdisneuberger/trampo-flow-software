import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import {
  useEffect,
  useRef,
  type KeyboardEventHandler,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const { onKeyDown, ...dragListeners } = listeners ?? {};
  const navigate = useNavigate();
  const suppressClickRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const didMoveRef = useRef(false);

  useEffect(() => {
    if (isDragging) {
      suppressClickRef.current = true;

      return;
    }

    // O click disparado após o drop chega antes deste timeout. Ele não deve
    // navegar para o detalhe quando o gesto foi um arraste.
    const timeout = window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [isDragging]);

  const openDetails = () => {
    void navigate(`/candidaturas/${application.id}`);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    didMoveRef.current = false;
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;

    if (!start) {
      return;
    }

    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) {
      didMoveRef.current = true;
    }
  };

  const handlePointerUp = () => {
    // O click é disparado antes deste timeout; assim o gesto de arraste não
    // abre o detalhe, mas o próximo clique volta a funcionar normalmente.
    window.setTimeout(() => {
      didMoveRef.current = false;
      pointerStartRef.current = null;
    }, 0);
  };

  const handleCardClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Mantém Ctrl/Cmd/Shift+click e clique do meio abrindo em nova aba.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();

    if (didMoveRef.current || suppressClickRef.current) {
      didMoveRef.current = false;

      return;
    }

    openDetails();
  };

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
      {...dragListeners}
      onPointerDownCapture={handlePointerDown}
      onPointerMoveCapture={handlePointerMove}
      onPointerUpCapture={handlePointerUp}
      onPointerCancelCapture={handlePointerUp}
      className="group cursor-grab rounded-lg border border-line bg-white p-3 active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        {draggingEnabled && (
          <button
            type="button"
            {...attributes}
            onKeyDown={
              onKeyDown as KeyboardEventHandler<HTMLButtonElement> | undefined
            }
            aria-label={`Mover ${application.title}`}
            className="mt-0.5 rounded p-0.5 text-ink-500 opacity-0 transition hover:text-ink-700 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        )}

        <Link
          to={`/candidaturas/${application.id}`}
          aria-label={application.title}
          title="Abrir detalhes"
          draggable={false}
          onClick={handleCardClick}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              openDetails();
            }
          }}
          className="min-w-0 flex-1 touch-manipulation rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
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
            <span className="text-[11px] text-ink-500">
              {formatDate(application.updatedAt)}
            </span>
          </div>
        </Link>

        <Menu
          label={`Ações de ${application.title}`}
          items={menuItems}
          className="shrink-0"
        />
      </div>
    </div>
  );
}
