import { useQuery } from '@tanstack/react-query';
import { applicationsService } from '../services/api/applications.service';

export function useApplication(id: string) {
  return useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsService.getById(id),
    enabled: id.length > 0,
  });
}
