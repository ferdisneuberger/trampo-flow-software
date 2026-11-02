import type {
  Application,
  ApplicationBoard,
  CreateApplicationInput,
  DeleteApplicationMode,
  PlaceApplicationInput,
  UpdateApplicationInput,
} from '../applications.types';
import { apiClient } from './client';

export const applicationsService = {
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

  async remove(
    id: string,
    mode: DeleteApplicationMode = 'soft',
  ): Promise<void> {
    await apiClient.delete(`/applications/${id}`, {
      params: { mode },
    });
  },
};
