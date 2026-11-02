import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Application } from '../../services/applications.types';
import { formatDate } from '../../utils/format';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

type ApplicationsTableProps = {
  applications: Application[];
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void;
};

export function ApplicationsTable({
  applications,
  onEdit,
  onDelete,
}: ApplicationsTableProps) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-surface/60 text-[11px] uppercase tracking-wide text-ink-400">
            <th scope="col" className="px-4 py-3 font-semibold">
              Vaga
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 font-semibold md:table-cell"
            >
              Empresa
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Status
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 font-semibold lg:table-cell"
            >
              Fase
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 font-semibold sm:table-cell"
            >
              Atualizada em
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr
              key={application.id}
              className="border-b border-line last:border-b-0 hover:bg-surface/50"
            >
              <td className="px-4 py-3">
                <Link
                  to={`/candidaturas/${application.id}`}
                  className="line-clamp-1 font-medium text-ink-900 underline-offset-4 hover:text-brand-700 hover:underline"
                  title={application.title}
                >
                  {application.title}
                </Link>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-400 md:hidden">
                  {application.company}
                  <a
                    href={application.link}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Abrir vaga de ${application.title}`}
                    className="text-ink-400 hover:text-brand-700"
                  >
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                </span>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                {application.companyUrl ? (
                  <a
                    href={application.companyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink-700 underline-offset-4 hover:text-brand-700 hover:underline"
                    title={application.companyUrl}
                  >
                    {application.company}
                  </a>
                ) : (
                  <span className="text-ink-700">{application.company}</span>
                )}
              </td>
              <td className="px-4 py-3">
                <ApplicationStatusBadge status={application.status} />
              </td>
              <td className="hidden max-w-[16rem] px-4 py-3 lg:table-cell">
                <span className="line-clamp-1 text-ink-700">
                  {application.currentPhase}
                </span>
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3 text-ink-500 sm:table-cell">
                {formatDate(application.updatedAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(application)}
                    aria-label={`Editar ${application.title}`}
                    className="rounded-lg p-2 text-ink-500 transition hover:bg-surface hover:text-ink-900"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(application)}
                    aria-label={`Excluir ${application.title}`}
                    className="rounded-lg p-2 text-ink-500 transition hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
