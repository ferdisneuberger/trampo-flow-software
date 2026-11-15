export const APPLICATION_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Mesmos nomes da interface (frontend/src/services/applications.types.ts). */
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: 'Aguardando',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Finalizada',
  REJECTED: 'Recusada',
};

export const STATUS_HELP = APPLICATION_STATUSES.map(
  (status) => `${status} = ${STATUS_LABELS[status]}`,
).join(', ');

export type Application = {
  id: string;
  title: string;
  link: string;
  company: string;
  companyUrl: string | null;
  position: number;
  status: ApplicationStatus;
  currentPhase: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type PaginatedApplications = {
  items: Application[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type BoardColumn = {
  status: ApplicationStatus;
  total: number;
  items: Application[];
  hasMore: boolean;
};

export type Board = { columns: BoardColumn[] };

export type ApplicationStats = {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
};

export type JobPostingPreview = {
  title: string | null;
  company: string | null;
  companyUrl: string | null;
  status:
    'found' | 'no_data' | 'blocked' | 'timeout' | 'not_html' | 'unreachable';
};
