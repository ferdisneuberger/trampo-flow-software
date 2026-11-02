import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { applicationsService } from '../services/api/applications.service';
import type {
  Application,
  CreateApplicationFileInput,
  CreateApplicationInput,
  DeleteApplicationMode,
  UpdateApplicationInput,
} from '../services/applications.types';
import { getErrorMessage } from '../utils/errors';

const PAGE_SIZE = 100;

export type UseApplicationsResult = {
  applications: Application[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createApplication: (input: CreateApplicationInput) => Promise<Application>;
  updateApplication: (
    id: string,
    input: UpdateApplicationInput,
  ) => Promise<Application>;
  addFiles: (
    id: string,
    files: CreateApplicationFileInput[],
  ) => Promise<Application>;
  deleteApplication: (
    id: string,
    mode?: DeleteApplicationMode,
  ) => Promise<void>;
  clearError: () => void;
};

export function useApplications(): UseApplicationsResult {
  const queryClient = useQueryClient();
  const [errorDismissed, setErrorDismissed] = useState(false);

  const query = useInfiniteQuery({
    queryKey: ['applications'],
    queryFn: ({ pageParam }) =>
      applicationsService.listPage({ cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['applications'] });
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (input: CreateApplicationInput) =>
      applicationsService.create(input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateApplicationInput;
    }) => applicationsService.update(id, input),
    onSuccess: invalidate,
  });

  const addFilesMutation = useMutation({
    mutationFn: ({
      id,
      files,
    }: {
      id: string;
      files: CreateApplicationFileInput[];
    }) => applicationsService.addFiles(id, files),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: DeleteApplicationMode }) =>
      applicationsService.remove(id, mode),
    onSuccess: invalidate,
  });

  const applications = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const rawError =
    query.error ??
    createMutation.error ??
    updateMutation.error ??
    addFilesMutation.error ??
    deleteMutation.error;

  useEffect(() => {
    if (!rawError) {
      setErrorDismissed(false);
    }
  }, [rawError]);

  const clearError = useCallback(() => {
    setErrorDismissed(true);
  }, []);

  const refresh = useCallback(async () => {
    setErrorDismissed(false);
    await query.refetch();
  }, [query]);

  const runMutation = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      setErrorDismissed(false);

      return operation();
    },
    [],
  );

  const createApplication = useCallback(
    (input: CreateApplicationInput) =>
      runMutation(() => createMutation.mutateAsync(input)),
    [createMutation, runMutation],
  );

  const updateApplication = useCallback(
    (id: string, input: UpdateApplicationInput) =>
      runMutation(() => updateMutation.mutateAsync({ id, input })),
    [runMutation, updateMutation],
  );

  const addFiles = useCallback(
    (id: string, files: CreateApplicationFileInput[]) =>
      runMutation(() => addFilesMutation.mutateAsync({ id, files })),
    [addFilesMutation, runMutation],
  );

  const deleteApplication = useCallback(
    async (id: string, mode: DeleteApplicationMode = 'soft') => {
      await runMutation(() => deleteMutation.mutateAsync({ id, mode }));
    },
    [deleteMutation, runMutation],
  );

  return {
    applications,
    isLoading: query.isPending,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      addFilesMutation.isPending ||
      deleteMutation.isPending,
    error: errorDismissed || !rawError ? null : getErrorMessage(rawError),
    refresh,
    createApplication,
    updateApplication,
    addFiles,
    deleteApplication,
    clearError,
  };
}
