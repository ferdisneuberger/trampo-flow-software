import type {
  Application,
  ApplicationStatus,
  CreateApplicationFileInput,
  CreateApplicationInput,
  DeleteApplicationMode,
  UpdateApplicationInput,
} from '../applications.types';
import { apiClient } from './client';

export type ListApplicationsParams = {
  search?: string;
  status?: ApplicationStatus;
  cursor?: string;
  limit?: number;
  sort?: 'recent' | 'stale';
};

export type PaginatedApplications = {
  items: Application[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type ApplicationStats = {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
};

export const applicationsService = {
  async listPage(
    params: ListApplicationsParams = {},
  ): Promise<PaginatedApplications> {
    const { data } = await apiClient.get<PaginatedApplications>(
      '/applications',
      { params },
    );

    return data;
  },

  async stats(): Promise<ApplicationStats> {
    const { data } = await apiClient.get<ApplicationStats>(
      '/applications/stats',
    );

    return data;
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
