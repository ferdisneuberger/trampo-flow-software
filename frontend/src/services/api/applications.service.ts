import type {
  Application,
  CreateApplicationFileInput,
  CreateApplicationInput,
  DeleteApplicationMode,
  UpdateApplicationInput,
} from '../applications.types';
import { apiClient } from './client';

type PaginatedApplications = {
  items: Application[];
  nextCursor: string | null;
  hasMore: boolean;
};

export const applicationsService = {
  async list(): Promise<Application[]> {
    const { data } =
      await apiClient.get<PaginatedApplications>('/applications');

    return data.items;
  },

  async create(input: CreateApplicationInput): Promise<Application> {
    const { data } = await apiClient.post<Application>('/applications', input);

    return data;
  },

  async update(
    id: string,
    input: UpdateApplicationInput,
  ): Promise<Application> {
    const { data } = await apiClient.patch<Application>(
      `/applications/${id}`,
      input,
    );

    return data;
  },

  async addFiles(
    id: string,
    files: CreateApplicationFileInput[],
  ): Promise<Application> {
    const { data } = await apiClient.post<Application>(
      `/applications/${id}/files`,
      { files },
    );

    return data;
  },

  async remove(
    id: string,
    mode: DeleteApplicationMode = 'soft',
  ): Promise<void> {
    await apiClient.delete(`/applications/${id}`, {
      params: { mode },
    });
  },
};
