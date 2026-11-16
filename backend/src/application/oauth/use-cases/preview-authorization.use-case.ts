import { Injectable } from '@nestjs/common';
import { parseScope } from '../../../domain/auth/scopes';
import {
  SCOPE_APPLICATIONS_READ,
  SCOPE_APPLICATIONS_WRITE,
  SCOPE_OFFLINE_ACCESS,
} from '../../../domain/oauth/scopes';
import {
  AuthorizationParams,
  AuthorizationRequestValidator,
} from '../services/authorization-request';

export type AuthorizationPreview = {
  client: { name: string; verified: boolean; redirectHost: string };
  scopes: { id: string; label: string }[];
  cannotDo: string[];
};

const SCOPE_LABELS: Record<string, string> = {
  [SCOPE_APPLICATIONS_READ]: 'Ver suas candidaturas',
  [SCOPE_APPLICATIONS_WRITE]: 'Criar, atualizar e mover candidaturas',
  [SCOPE_OFFLINE_ACCESS]: 'Continuar conectado sem pedir login de novo',
};

@Injectable()
export class PreviewAuthorizationUseCase {
  constructor(private readonly validator: AuthorizationRequestValidator) {}

  async execute(params: AuthorizationParams): Promise<AuthorizationPreview> {
    const request = await this.validator.validate(params);

    return {
      client: {
        name: request.client.name,
        verified: request.verified,
        redirectHost: request.redirectHost,
      },
      scopes: parseScope(request.scope).map((id) => ({
        id,
        label: SCOPE_LABELS[id] ?? id,
      })),
      cannotDo: ['apagar candidaturas'],
    };
  }
}
