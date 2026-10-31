import {
  CalendarDays,
  ExternalLink,
  FileText,
  Paperclip,
  Pencil,
  Trash2,
} from 'lucide-react';
import type {
  Application,
  ApplicationStatus,
} from '../../services/applications.types';
import { cn } from '../../utils/cn';
import { formatDate, formatFileSize } from '../../utils/format';
import { getHostname } from '../../utils/url';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

const statusAccents: Record<ApplicationStatus, string> = {
  PENDING: 'bg-amber-400',
  IN_PROGRESS: 'bg-sky-500',
  COMPLETED: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
};

type ApplicationCardProps = {
  application: Application;
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void;
};

export function ApplicationCard({
  application,
  onEdit,
  onDelete,
}: ApplicationCardProps) {
  const fileCount = application.files.length;
  const hasFiles = fileCount > 0;

  return (
    <Card className="relative flex h-full flex-col overflow-hidden p-5 pl-6">
      <span
        className={cn(
          'absolute inset-y-0 left-0 w-1.5',
          statusAccents[application.status],
        )}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-6 tracking-tight text-ink-900">
            <a
              href={application.link}
              target="_blank"
              rel="noreferrer"
              className="line-clamp-2 underline-offset-4 transition hover:text-brand-700 hover:underline"
              title={application.title}
            >
              {application.title}
            </a>
          </h3>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-500">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            Atualizada em {formatDate(application.updatedAt)}
          </p>
        </div>
        <div className="shrink-0">
          <ApplicationStatusBadge status={application.status} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-surface/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            Fase atual
          </p>
          <p className="mt-1 break-words text-sm font-medium text-ink-900">
            {application.currentPhase}
          </p>
        </div>
        <div className="rounded-xl bg-surface/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            Link da vaga
          </p>
          <a
            href={application.link}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-brand-600 underline-offset-4 transition hover:text-brand-700 hover:underline"
            title={application.link}
          >
            <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{getHostname(application.link)}</span>
          </a>
        </div>
      </div>

      <div className="mt-4 flex-1 border-t border-line pt-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
          <Paperclip className="size-3.5" aria-hidden="true" />
          Arquivos ({fileCount})
        </div>

        {hasFiles ? (
          <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
            {application.files.map((file) => (
              <li key={file.id}>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2 rounded-lg border border-line/70 px-2.5 py-2 transition hover:border-brand-200 hover:bg-brand-50/50"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <FileText className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-900 transition group-hover:text-brand-700">
                      {file.name}
                    </span>
                    <span className="block text-[11px] text-ink-400">
                      {file.mimeType} · {formatFileSize(file.sizeInBytes)}
                    </span>
                  </span>
                  <ExternalLink
                    className="size-3.5 shrink-0 text-ink-400 transition group-hover:text-brand-600"
                    aria-hidden="true"
                  />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-400">
            <Paperclip className="size-3.5" aria-hidden="true" />
            Nenhum arquivo anexado.
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(application)}
          aria-label={`Editar ${application.title}`}
        >
          <Pencil className="size-4" aria-hidden="true" />
          Editar
        </Button>
        <Button
          type="button"
          variant="ghost-danger"
          size="sm"
          onClick={() => onDelete(application)}
          aria-label={`Excluir ${application.title}`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Excluir
        </Button>
      </div>
    </Card>
  );
}
