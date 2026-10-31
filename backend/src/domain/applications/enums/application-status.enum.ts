export enum ApplicationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export const APPLICATION_STATUSES = Object.values(ApplicationStatus);

export function isApplicationStatus(
  value: unknown,
): value is ApplicationStatus {
  return (
    typeof value === 'string' &&
    APPLICATION_STATUSES.includes(value as ApplicationStatus)
  );
}
