import type {
  CreatedPersonalAccessToken,
  CreatePersonalAccessTokenInput,
  PersonalAccessToken,
} from '../personal-access-tokens.types';
import { apiClient } from './client';

export const personalAccessTokensService = {
  async list(): Promise<PersonalAccessToken[]> {
    const { data } = await apiClient.get<PersonalAccessToken[]>('/auth/tokens');

    return data;
  },

  async create(
    input: CreatePersonalAccessTokenInput,
  ): Promise<CreatedPersonalAccessToken> {
    const { data } = await apiClient.post<CreatedPersonalAccessToken>(
      '/auth/tokens',
      input,
    );

    return data;
  },

  async revoke(id: string): Promise<void> {
    await apiClient.delete(`/auth/tokens/${id}`);
  },
};
