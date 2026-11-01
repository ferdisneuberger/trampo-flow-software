import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from '../../services/applications.types';
import { Badge, type BadgeTone } from '../ui/Badge';

const statusTones: Record<ApplicationStatus, BadgeTone> = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  REJECTED: 'danger',
};

type ApplicationStatusBadgeProps = {
  status: ApplicationStatus;
};

export function ApplicationStatusBadge({
  status,
}: ApplicationStatusBadgeProps) {
  return (
    <Badge tone={statusTones[status]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}
