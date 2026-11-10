import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, GripVertical, Link2 } from 'lucide-react';
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
import { formatUrlHost } from '../../utils/url';
import { Menu, type MenuItem } from '../ui/Menu';

type BoardCardProps = {
  application: Application;
  draggingEnabled: boolean;
  onMove: (application: Application, status: ApplicationStatus) => void;
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void;
};

function CompanyBadge({ company }: { company: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-btn border border-line bg-surface-2 text-[13px] font-semibold text-fg-soft"
    >
      {company.trim().charAt(0).toUpperCase() || 'T'}
    </span>
  );
}

function BoardCardSummary({ application }: { application: Application }) {
  const jobHost = formatUrlHost(application.link);

  return (
    <>
      <p className="line-clamp-2 text-[14.5px] font-semibold leading-snug text-fg">
        {application.title}
      </p>
      <p className="mt-0.5 truncate text-[13px] text-muted">
        {application.company}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3 shrink-0" aria-hidden="true" />
          {formatDate(application.updatedAt)}
        </span>
        {jobHost && (
          <span className="inline-flex min-w-0 items-center gap-1">
            <Link2 className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{jobHost}</span>
          </span>
        )}
      </div>
    </>
  );
}

/**
 * Prévia usada no `DragOverlay`. O dnd-kit dimensiona o wrapper com o retângulo
 * exato do card original; por isso o conteúdo precisa preencher 100% e repetir
 * a mesma estrutura do card (alça, textos e menu) para não "encolher" durante
 * o arraste.
 */
export function BoardCardOverlay({
  application,
}: {
  application: Application;
}) {
  return (
    <div className="flex h-full w-full items-start gap-2 rounded-card border border-line-strong bg-surface p-3 shadow-pop">
      <CompanyBadge company={application.company} />

      <div className="min-w-0 flex-1">
        <BoardCardSummary application={application} />
      </div>

      <span
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted"
        aria-hidden="true"
      >
        <span className="text-base leading-none">⋯</span>
      </span>
    </div>
  );
}

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
      className="group cursor-grab rounded-card border border-line bg-surface p-3 transition-colors hover:border-line-strong active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <CompanyBadge company={application.company} />

        <div className="flex min-w-0 flex-1 items-start gap-1.5">
          <span
            className="inline-block max-w-full truncate rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium text-fg-soft"
            title={application.currentPhase}
          >
            {application.currentPhase}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {draggingEnabled && (
            <button
              type="button"
              {...attributes}
              onKeyDown={
                onKeyDown as KeyboardEventHandler<HTMLButtonElement> | undefined
              }
              aria-label={`Mover ${application.title}`}
              className="grid size-6 place-items-center rounded-md text-muted opacity-0 transition hover:bg-surface-2 hover:text-fg focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30 group-hover:opacity-100"
            >
              <GripVertical className="size-3.5" aria-hidden="true" />
            </button>
          )}

          <Menu
            label={`Ações de ${application.title}`}
            items={menuItems}
            className="shrink-0"
          />
        </div>
      </div>

      <Link
        to={`/candidaturas/${application.id}`}
        title="Abrir detalhes"
        draggable={false}
        onClick={handleCardClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            openDetails();
          }
        }}
        className="mt-2.5 block min-w-0 touch-manipulation rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30"
      >
        <BoardCardSummary application={application} />
      </Link>
    </div>
  );
}
