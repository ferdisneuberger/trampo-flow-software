import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { invalidateApplicationData } from '../lib/invalidate';
import { applicationsService } from '../services/api/applications.service';
import type {
  Application,
  CreateApplicationInput,
  DeleteApplicationMode,
  UpdateApplicationInput,
} from '../services/applications.types';

export function useApplicationMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (input: CreateApplicationInput) =>
      applicationsService.create(input),
    onSuccess: (application) =>
      invalidateApplicationData(queryClient, application.id),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateApplicationInput;
    }) => applicationsService.update(id, input),
    onSuccess: (application) =>
      invalidateApplicationData(queryClient, application.id),
  });

  const remove = useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: DeleteApplicationMode }) =>
      applicationsService.remove(id, mode),
    onSuccess: (_data, variables) =>
      invalidateApplicationData(queryClient, variables.id),
  });

  const uploadFile = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      applicationsService.uploadFile(id, file),
    onSuccess: (application) =>
      invalidateApplicationData(queryClient, application.id),
  });

  const removeFile = useMutation({
    mutationFn: ({ id, fileId }: { id: string; fileId: string }) =>
      applicationsService.removeFile(id, fileId),
    onSuccess: (_data, variables) =>
      invalidateApplicationData(queryClient, variables.id),
  });

  const createApplication = useCallback(
    (input: CreateApplicationInput): Promise<Application> =>
      create.mutateAsync(input),
    [create],
  );

  const updateApplication = useCallback(
    (id: string, input: UpdateApplicationInput): Promise<Application> =>
      update.mutateAsync({ id, input }),
    [update],
  );

  const deleteApplication = useCallback(
    (id: string, mode: DeleteApplicationMode = 'soft'): Promise<void> =>
      remove.mutateAsync({ id, mode }),
    [remove],
  );

  const uploadApplicationFile = useCallback(
    (id: string, file: File): Promise<Application> =>
      uploadFile.mutateAsync({ id, file }),
    [uploadFile],
  );

  const removeApplicationFile = useCallback(
    (id: string, fileId: string): Promise<void> =>
      removeFile.mutateAsync({ id, fileId }),
    [removeFile],
  );

  return {
    createApplication,
    updateApplication,
    deleteApplication,
    uploadApplicationFile,
    removeApplicationFile,
  };
}
