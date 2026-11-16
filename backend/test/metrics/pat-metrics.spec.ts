import { describe, expect, it, vi } from 'vitest';
import { PersonalAccessToken } from '../../src/domain/auth/entities/personal-access-token.entity';
import { PersonalAccessTokensController } from '../../src/infrastructure/http/controllers/personal-access-tokens.controller';
import { SpyAppMetrics } from '../helpers/spy-app-metrics';

function setup(scope: string) {
  const metrics = new SpyAppMetrics();
  const token = PersonalAccessToken.create({
    userId: 'u1',
    name: 'Claude Code',
    tokenHash: 'h',
    prefix: 'tfp_abcd',
    expiresAt: new Date(Date.now() + 86_400_000),
    scope,
  });
  const controller = new PersonalAccessTokensController(
    {
      execute: vi.fn().mockResolvedValue({ token, secret: 'tfp_segredo' }),
    } as never,
    { execute: vi.fn() } as never,
    { execute: vi.fn().mockResolvedValue(undefined) } as never,
    { consume: vi.fn() } as never,
    metrics,
  );

  return { controller, metrics };
}

describe('métricas dos tokens de integração', () => {
  it('criação por escopo e revogação', async () => {
    const readWrite = setup('applications:read applications:write');
    const readOnly = setup('applications:read');

    await readWrite.controller.create({ name: 'x', expiresInDays: 30 }, 'u1');
    await readOnly.controller.create(
      { name: 'x', expiresInDays: 30, scope: 'applications:read' },
      'u1',
    );
    await readWrite.controller.revoke(
      '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
      'u1',
    );

    expect(readWrite.metrics.of('personalToken')).toEqual([
      ['created', 'read_write'],
      ['revoked', 'unknown'],
    ]);
    expect(readOnly.metrics.of('personalToken')).toEqual([['created', 'read']]);
  });
});
