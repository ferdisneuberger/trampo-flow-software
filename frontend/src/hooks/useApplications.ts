import { useCallback, useEffect, useState } from 'react';
import { applicationsService } from '../services/api/applications.service';
import type {
  Application,
  CreateApplicationFileInput,
  CreateApplicationInput,
  DeleteApplicationMode,
  UpdateApplicationInput,
} from '../services/applications.types';
import { getErrorMessage } from '../utils/errors';

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
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setApplications(await applicationsService.list());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runMutation = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      setIsMutating(true);
      setError(null);

      try {
        return await operation();
      } catch (requestError) {
        setError(getErrorMessage(requestError));
        throw requestError;
      } finally {
        setIsMutating(false);
      }
    },
    [],
  );

  const createApplication = useCallback(
    async (input: CreateApplicationInput): Promise<Application> => {
      const application = await runMutation(() =>
        applicationsService.create(input),
      );

      setApplications((current) => [application, ...current]);

      return application;
    },
    [runMutation],
  );

  const updateApplication = useCallback(
    async (
      id: string,
      input: UpdateApplicationInput,
    ): Promise<Application> => {
      const application = await runMutation(() =>
        applicationsService.update(id, input),
      );

      setApplications((current) =>
        current.map((item) => (item.id === id ? application : item)),
      );

      return application;
    },
    [runMutation],
  );

  const addFiles = useCallback(
    async (
      id: string,
      files: CreateApplicationFileInput[],
    ): Promise<Application> => {
      const application = await runMutation(() =>
        applicationsService.addFiles(id, files),
      );

      setApplications((current) =>
        current.map((item) => (item.id === id ? application : item)),
      );

      return application;
    },
    [runMutation],
  );

  const deleteApplication = useCallback(
    async (
      id: string,
      mode: DeleteApplicationMode = 'soft',
    ): Promise<void> => {
      await runMutation(() => applicationsService.remove(id, mode));

      setApplications((current) =>
        current.filter((application) => application.id !== id),
      );
    },
    [runMutation],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    applications,
    isLoading,
    isMutating,
    error,
    refresh,
    createApplication,
    updateApplication,
    addFiles,
    deleteApplication,
    clearError,
  };
}
