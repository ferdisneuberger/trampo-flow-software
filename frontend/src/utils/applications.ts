import type {
  Application,
  ApplicationStatus,
} from '../services/applications.types';

const initialCounts: Record<ApplicationStatus, number> = {
  PENDING: 0,
  IN_PROGRESS: 0,
  COMPLETED: 0,
  REJECTED: 0,
};

export function countApplicationsByStatus(
  applications: Application[],
): Record<ApplicationStatus, number> {
  return applications.reduce<Record<ApplicationStatus, number>>(
    (counts, application) => {
      counts[application.status] += 1;

      return counts;
    },
    { ...initialCounts },
  );
}
