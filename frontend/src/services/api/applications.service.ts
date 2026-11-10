import type {
  Application,
  ApplicationBoard,
  CreateApplicationInput,
  DeleteApplicationMode,
  JobPostingPreview,
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

  /** Lê título, empresa e site a partir do link da vaga. Não grava nada. */
  async preview(
    link: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<JobPostingPreview> {
    const { data } = await apiClient.post<JobPostingPreview>(
      '/applications/preview',
      { link },
      { signal: options.signal },
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

  async remove(
    id: string,
    mode: DeleteApplicationMode = 'soft',
  ): Promise<void> {
    await apiClient.delete(`/applications/${id}`, {
      params: { mode },
    });
  },
};
