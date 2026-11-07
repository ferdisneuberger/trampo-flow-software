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

const logoPalettes = [
  { background: '#e9d5ff', color: '#4c1d95' },
  { background: '#fed7aa', color: '#9a3412' },
  { background: '#99f6e4', color: '#115e59' },
  { background: '#fef08a', color: '#854d0e' },
  { background: '#ddd6fe', color: '#5b21b6' },
  { background: '#fecdd3', color: '#9f1239' },
  { background: '#bfdbfe', color: '#1e3a8a' },
  { background: '#cbd5e1', color: '#1e293b' },
];

function getLogoPalette(company: string) {
  let hash = 0;

  for (const character of company) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return logoPalettes[hash % logoPalettes.length];
}

function CompanyBadge({ company }: { company: string }) {
  const palette = getLogoPalette(company);

  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-ink-900 font-display text-sm font-extrabold shadow-[1.5px_1.5px_0_var(--color-shadow)]"
      style={{ backgroundColor: palette.background, color: palette.color }}
    >
      {company.trim().charAt(0).toUpperCase() || 'T'}
    </span>
  );
}

function BoardCardSummary({ application }: { application: Application }) {
  const jobHost = formatUrlHost(application.link);

  return (
    <>
      <p className="line-clamp-2 font-display text-[15px] font-bold leading-tight tracking-[-0.02em] text-ink-900">
        {application.title}
      </p>
      <p className="mt-0.5 truncate text-xs text-ink-500">
        {application.company}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-ink-900/20 pt-2 font-mono text-[9px] font-bold uppercase tracking-[0.02em] text-ink-500">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3 shrink-0" aria-hidden="true" />
          {formatDate(application.updatedAt)}
        </span>
        {jobHost && (
          <span className="inline-flex min-w-0 items-center gap-1">
            <Link2 className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate normal-case tracking-normal">
              {jobHost}
            </span>
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
    <div className="flex h-full w-full items-start gap-2 rounded-xl border-2 border-ink-900 bg-surface p-3 shadow-hard-lg">
      <CompanyBadge company={application.company} />

      <div className="min-w-0 flex-1">
        <BoardCardSummary application={application} />
      </div>

      <span
        className="grid size-7 shrink-0 place-items-center rounded-md text-ink-500"
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
      className="group cursor-grab rounded-xl border-2 border-ink-900 bg-surface p-3 shadow-[3px_3px_0_var(--color-shadow)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-surface-raised hover:shadow-[5px_5px_0_var(--color-shadow)] active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <CompanyBadge company={application.company} />

        <div className="flex min-w-0 flex-1 items-start gap-1.5">
          <span
            className="inline-block max-w-full truncate rounded-md border-2 border-ink-900 bg-yellow px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.03em] text-on-accent"
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
              className="grid size-6 place-items-center rounded-md text-ink-500 opacity-0 transition hover:bg-accent-soft hover:text-ink-900 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/30 group-hover:opacity-100"
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
        className="mt-3 block min-w-0 touch-manipulation rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt/20"
      >
        <BoardCardSummary application={application} />
      </Link>
    </div>
  );
}
