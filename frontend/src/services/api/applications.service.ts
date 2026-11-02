import type {
  Application,
  ApplicationBoard,
  ApplicationStatus,
  CreateApplicationFileInput,
  CreateApplicationInput,
  DeleteApplicationMode,
  PlaceApplicationInput,
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

  async board(params: { search?: string } = {}): Promise<ApplicationBoard> {
    const { data } = await apiClient.get<ApplicationBoard>(
      '/applications/board',
      { params },
    );

    return data;
  },

  async place(id: string, input: PlaceApplicationInput): Promise<Application> {
    const { data } = await apiClient.patch<Application>(
      `/applications/${id}/placement`,
      input,
    );

    return data;
  },

  async getById(id: string): Promise<Application> {
    const { data } = await apiClient.get<Application>(`/applications/${id}`);

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

  async uploadFile(id: string, file: File): Promise<Application> {
    const form = new FormData();
    form.append('file', file);

    const { data } = await apiClient.post<Application>(
      `/applications/${id}/files/upload`,
      form,
    );

    return data;
  },

  async removeFile(id: string, fileId: string): Promise<void> {
    await apiClient.delete(`/applications/${id}/files/${fileId}`);
  },

  async downloadFile(downloadUrl: string): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(downloadUrl, {
      responseType: 'blob',
    });

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
