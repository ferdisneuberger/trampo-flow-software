import { randomUUID } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import { BusinessGaugesService } from '../../src/infrastructure/metrics/business-gauges.service';
import { PromAppMetrics } from '../../src/infrastructure/metrics/prom-app-metrics';
import {
  createTestPrisma,
  TEST_DATABASE_URL,
  truncateUserData,
} from '../helpers/test-database';

const DAY = 86_400_000;

/** Estoques de negócio contra Postgres real: cada gauge confere com o que foi semeado. */
describe.skipIf(!TEST_DATABASE_URL)('BusinessGaugesService (Postgres)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await createTestPrisma();
  });

  beforeEach(async () => {
    await truncateUserData(prisma);
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "oauth_clients" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  async function user(options: { verified?: boolean; google?: boolean } = {}) {
    const id = randomUUID();

    await prisma.user.create({
      data: {
        id,
        email: `${id}@example.com`,
        passwordHash: options.google ? null : 'scrypt$16384$8$1$c2FsdA==$a2V5',
        googleId: options.google ? `g-${id}` : null,
        emailVerifiedAt: options.verified === false ? null : new Date(),
      },
    });

    return id;
  }

  async function application(
    userId: string,
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED',
    options: { ageDays?: number; deleted?: boolean } = {},
  ) {
    await prisma.application.create({
      data: {
        id: randomUUID(),
        userId,
        title: 'Vaga',
        link: 'https://example.com/v',
        company: 'Acme',
        currentPhase: 'Triagem',
        status,
        deletedAt: options.deleted ? new Date() : null,
      },
    });

    if (options.ageDays) {
      await prisma.$executeRaw`UPDATE applications SET updated_at = now() - (${options.ageDays}::int * interval '1 day') WHERE user_id = ${userId}::uuid AND title = 'Vaga' AND updated_at > now() - interval '1 hour'`;
    }
  }

  async function value(
    metrics: PromAppMetrics,
    name: string,
    labels: Record<string, string> = {},
  ) {
    const all = await metrics.registry.getMetricsAsJSON();
    const row = all
      .find((metric) => metric.name === name)
      ?.values.find((item) =>
        Object.entries(labels).every(
          ([key, expected]) => item.labels[key] === expected,
        ),
      );

    return row?.value;
  }

  function service(metrics: PromAppMetrics) {
    return new BusinessGaugesService(metrics, prisma, {
      get: () => undefined,
    } as unknown as ConfigService);
  }

  it('usuários por estado e provedor, candidaturas por status e funil', async () => {
    const a = await user();
    const b = await user({ google: true });
    await user({ verified: false });

    await application(a, 'PENDING');
    await application(a, 'IN_PROGRESS');
    await application(a, 'COMPLETED');
    await application(b, 'PENDING');
    await application(b, 'REJECTED', { deleted: true });

    const metrics = new PromAppMetrics();

    await service(metrics).refresh();

    expect(
      await value(metrics, 'trampo_users', {
        state: 'verified',
        provider: 'password',
      }),
    ).toBe(1);
    expect(
      await value(metrics, 'trampo_users', {
        state: 'verified',
        provider: 'google',
      }),
    ).toBe(1);
    expect(
      await value(metrics, 'trampo_users', {
        state: 'unverified',
        provider: 'password',
      }),
    ).toBe(1);
    expect(
      await value(metrics, 'trampo_users', {
        state: 'unverified',
        provider: 'google',
      }),
    ).toBe(0);

    expect(
      await value(metrics, 'trampo_applications', { status: 'PENDING' }),
    ).toBe(2);
    expect(
      await value(metrics, 'trampo_applications', { status: 'IN_PROGRESS' }),
    ).toBe(1);
    expect(
      await value(metrics, 'trampo_applications', { status: 'COMPLETED' }),
    ).toBe(1);
    // A candidatura excluída não conta.
    expect(
      await value(metrics, 'trampo_applications', { status: 'REJECTED' }),
    ).toBe(0);

    expect(
      await value(metrics, 'trampo_users_funnel', { stage: 'signed_up' }),
    ).toBe(3);
    expect(
      await value(metrics, 'trampo_users_funnel', { stage: 'email_verified' }),
    ).toBe(2);
    expect(
      await value(metrics, 'trampo_users_funnel', { stage: 'has_application' }),
    ).toBe(2);
    expect(
      await value(metrics, 'trampo_users_funnel', { stage: 'has_in_progress' }),
    ).toBe(1);
    expect(
      await value(metrics, 'trampo_users_funnel', { stage: 'has_completed' }),
    ).toBe(1);
    expect(
      await value(metrics, 'trampo_users_with_applications', { at_least: '1' }),
    ).toBe(2);
    expect(
      await value(metrics, 'trampo_users_with_applications', { at_least: '5' }),
    ).toBe(0);
    expect(
      await value(
        metrics,
        'trampo_business_gauges_last_refresh_timestamp_seconds',
      ),
    ).toBeGreaterThan(Date.now() / 1000 - 60);
  });

  it('usuários ativos por janela e pipeline parado', async () => {
    const recent = await user();
    const old = await user();

    await application(recent, 'PENDING');
    await application(old, 'IN_PROGRESS', { ageDays: 20 });
    await application(old, 'COMPLETED', { ageDays: 20 });

    const metrics = new PromAppMetrics();

    await service(metrics).refresh();

    expect(await value(metrics, 'trampo_users_active', { window: '1d' })).toBe(
      1,
    );
    expect(await value(metrics, 'trampo_users_active', { window: '7d' })).toBe(
      1,
    );
    expect(await value(metrics, 'trampo_users_active', { window: '30d' })).toBe(
      2,
    );
    // Só candidaturas ABERTAS contam como paradas (a finalizada não).
    expect(
      await value(metrics, 'trampo_applications_stale', { days: '7' }),
    ).toBe(1);
    expect(
      await value(metrics, 'trampo_applications_stale', { days: '14' }),
    ).toBe(1);
    expect(
      await value(metrics, 'trampo_applications_stale', { days: '30' }),
    ).toBe(0);
  });

  it('tokens de integração ativos, grants e clientes OAuth', async () => {
    const owner = await user();
    const token = (
      scope: string,
      options: { revoked?: boolean; expired?: boolean } = {},
    ) =>
      prisma.personalAccessToken.create({
        data: {
          id: randomUUID(),
          userId: owner,
          name: 't',
          tokenHash: randomUUID().replace(/-/g, ''),
          prefix: 'tfp_abcd',
          scope,
          expiresAt: new Date(Date.now() + (options.expired ? -DAY : DAY)),
          revokedAt: options.revoked ? new Date() : null,
        },
      });

    await token('applications:read applications:write');
    await token('applications:read applications:write');
    await token('applications:read');
    await token('applications:read', { revoked: true });
    await token('applications:read', { expired: true });

    const client = await prisma.oAuthClient.create({
      data: {
        id: randomUUID(),
        clientId: 'tfc_x',
        name: 'Claude',
        redirectUris: ['https://claude.ai/cb'],
        source: 'dcr',
      },
    });

    await prisma.oAuthClient.create({
      data: {
        id: randomUUID(),
        clientId: 'https://c.example/doc',
        name: 'Outro',
        redirectUris: ['http://localhost/cb'],
        source: 'cimd',
      },
    });
    await prisma.oAuthGrant.create({
      data: {
        id: randomUUID(),
        userId: owner,
        clientRef: client.id,
        scope: 'applications:read',
        resource: 'https://x/mcp',
      },
    });

    const metrics = new PromAppMetrics();

    await service(metrics).refresh();

    expect(
      await value(metrics, 'trampo_pat_active', { scope: 'read_write' }),
    ).toBe(2);
    expect(await value(metrics, 'trampo_pat_active', { scope: 'read' })).toBe(
      1,
    );
    expect(await value(metrics, 'trampo_oauth_grants_active')).toBe(1);
    expect(
      await value(metrics, 'trampo_oauth_clients', { source: 'dcr' }),
    ).toBe(1);
    expect(
      await value(metrics, 'trampo_oauth_clients', { source: 'cimd' }),
    ).toBe(1);
  });

  it('banco vazio: todos os estoques em zero, sem erro', async () => {
    const metrics = new PromAppMetrics();

    await service(metrics).refresh();

    expect(
      await value(metrics, 'trampo_applications', { status: 'PENDING' }),
    ).toBe(0);
    expect(
      await value(metrics, 'trampo_users_funnel', { stage: 'signed_up' }),
    ).toBe(0);
    expect(
      await value(metrics, 'trampo_business_gauges_refresh_failures_total'),
    ).toBe(0);
  });

  it('falha numa consulta: mantém o último valor, conta a falha e nunca lança', async () => {
    const owner = await user();

    await application(owner, 'PENDING');

    const metrics = new PromAppMetrics();
    const gauges = service(metrics);

    await gauges.refresh();
    expect(
      await value(metrics, 'trampo_applications', { status: 'PENDING' }),
    ).toBe(1);

    const broken = new BusinessGaugesService(
      metrics,
      {
        $queryRaw: () => Promise.reject(new Error('banco fora')),
        oAuthGrant: { count: () => Promise.reject(new Error('x')) },
      } as never,
      { get: () => undefined } as unknown as ConfigService,
    );

    await expect(broken.refresh()).resolves.toBeUndefined();

    expect(
      await value(metrics, 'trampo_applications', { status: 'PENDING' }),
    ).toBe(1);
    expect(
      await value(metrics, 'trampo_business_gauges_refresh_failures_total'),
    ).toBe(1);
  });

  it('não agenda nada com METRICS_ENABLED=false', () => {
    const gauges = new BusinessGaugesService(new PromAppMetrics(), prisma, {
      get: (key: string) => (key === 'METRICS_ENABLED' ? 'false' : undefined),
    } as unknown as ConfigService);

    gauges.onModuleInit();

    expect((gauges as unknown as { timer?: unknown }).timer).toBeUndefined();
  });
});
