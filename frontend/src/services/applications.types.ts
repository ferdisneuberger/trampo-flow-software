export const APPLICATION_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: 'Aguardando',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Finalizada',
  REJECTED: 'Recusada',
};

export const APPLICATION_STATUS_OPTIONS = APPLICATION_STATUSES.map((value) => ({
  value,
  label: APPLICATION_STATUS_LABELS[value],
}));

export type ApplicationFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeInBytes: number;
  uploadedAt: string;
  url: string | null;
  downloadUrl: string | null;
};

export type Application = {
  id: string;
  title: string;
  link: string;
  company: string;
  companyUrl: string | null;
  position: number;
  status: ApplicationStatus;
  currentPhase: string;
  files: ApplicationFile[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateApplicationFileInput = {
  name: string;
  url: string;
  mimeType: string;
  sizeInBytes: number;
  uploadedAt?: string;
};

export type CreateApplicationInput = {
  title: string;
  link: string;
  company: string;
  companyUrl?: string | null;
  currentPhase: string;
  status?: ApplicationStatus;
  files?: CreateApplicationFileInput[];
};

export type UpdateApplicationInput = {
  title?: string;
  link?: string;
  company?: string;
  companyUrl?: string | null;
  currentPhase?: string;
  status?: ApplicationStatus;
};

export type DeleteApplicationMode = 'soft' | 'hard';

export type BoardColumn = {
  status: ApplicationStatus;
  total: number;
  items: Application[];
  hasMore: boolean;
};

export type ApplicationBoard = {
  columns: BoardColumn[];
};

export type PlaceApplicationInput = {
  status?: ApplicationStatus;
  beforeId?: string;
  afterId?: string;
};
