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
  url: string;
  mimeType: string;
  sizeInBytes: number;
  uploadedAt: string;
};

export type Application = {
  id: string;
  title: string;
  link: string;
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
  currentPhase: string;
  status?: ApplicationStatus;
  files?: CreateApplicationFileInput[];
};

export type UpdateApplicationInput = {
  title?: string;
  link?: string;
  currentPhase?: string;
  status?: ApplicationStatus;
};

export type DeleteApplicationMode = 'soft' | 'hard';
