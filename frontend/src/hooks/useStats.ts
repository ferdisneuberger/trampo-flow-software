import { useQuery } from '@tanstack/react-query';
import { applicationsService } from '../services/api/applications.service';

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => applicationsService.stats(),
  });
}
