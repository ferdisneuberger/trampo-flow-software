import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

export function ApplicationListSkeleton() {
  return (
    <div
      className="grid gap-4 lg:grid-cols-2"
      aria-busy="true"
      aria-label="Carregando candidaturas"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="w-full space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-16 w-full" />
        </Card>
      ))}
    </div>
  );
}
