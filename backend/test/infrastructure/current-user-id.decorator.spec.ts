import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { requireUserId } from '../../src/infrastructure/auth/current-user-id.decorator';
import type { AuthenticatedRequest } from '../../src/infrastructure/auth/jwt-auth.guard';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';

function makeRequest(user?: { sub: string }): AuthenticatedRequest {
  return { user } as unknown as AuthenticatedRequest;
}

describe('requireUserId', () => {
  it('devolve o id do usuário autenticado', () => {
    expect(requireUserId(makeRequest({ sub: USER_ID }))).toBe(USER_ID);
  });

  it('rejeita quando a requisição não trouxe usuário', () => {
    expect(() => requireUserId(makeRequest())).toThrow(UnauthorizedException);
  });
});
