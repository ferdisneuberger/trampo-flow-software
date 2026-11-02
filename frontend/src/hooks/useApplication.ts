import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-keys';
import { applicationsService } from '../services/api/applications.service';

export function useApplication(id: string) {
  return useQuery({
    queryKey: queryKeys.application(id),
    queryFn: () => applicationsService.getById(id),
    enabled: id.length > 0,
  });
}
