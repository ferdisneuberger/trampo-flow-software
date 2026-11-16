import { beforeEach, describe, expect, it } from 'vitest';
import { CreateApplicationUseCase } from '../../src/application/applications/use-cases/create-application.use-case';
import { DeleteApplicationUseCase } from '../../src/application/applications/use-cases/delete-application.use-case';
import { PlaceApplicationUseCase } from '../../src/application/applications/use-cases/place-application.use-case';
import { PreviewJobPostingUseCase } from '../../src/application/applications/use-cases/preview-job-posting.use-case';
import { UpdateApplicationUseCase } from '../../src/application/applications/use-cases/update-application.use-case';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import {
  JobPageFetcher,
  type JobPageFetchResult,
} from '../../src/domain/applications/services/job-page-fetcher';
import { User } from '../../src/domain/users/entities/user.entity';
import { channelOf } from '../../src/infrastructure/auth/current-channel.decorator';
import type { AuthenticatedRequest } from '../../src/infrastructure/auth/jwt-auth.guard';
import { makeRestoredApplication } from '../factories/application.factory';
import { SpyAppMetrics } from '../helpers/spy-app-metrics';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';
const NOW = new Date('2026-01-01T00:00:00.000Z');

let repository: InMemoryApplicationRepository;
let metrics: SpyAppMetrics;

beforeEach(() => {
  repository = new InMemoryApplicationRepository();
  metrics = new SpyAppMetrics();
});

describe('métricas de candidaturas', () => {
  it('criação registra o canal e a fonte da vaga (nunca o texto livre)', async () => {
    const users = new InMemoryUserRepository();

    await users.create(
      User.restore({
        id: USER_ID,
        email: 'a@example.com',
        firstName: null,
        lastName: null,
        emailVerifiedAt: NOW,
        verificationSentAt: null,
        termsAcceptedAt: null,
        termsVersion: null,
        username: null,
        googleId: null,
        passwordHash: 'scrypt$16384$8$1$c2FsdA==$a2V5',
        lastLoginAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );

    const useCase = new CreateApplicationUseCase(repository, users, metrics);

    await useCase.execute({
      userId: USER_ID,
      title: 'Dev',
      link: 'https://empresa.gupy.io/jobs/1',
      company: 'Acme',
      currentPhase: 'Entrevista técnica com o CTO',
      channel: 'agent_oauth',
    });
    await useCase.execute({
      userId: USER_ID,
      title: 'Dev',
      link: 'https://example.com/vaga',
      company: 'Acme',
      currentPhase: 'Triagem',
    });

    expect(metrics.of('applicationCreated')).toEqual([
      ['agent_oauth', 'https://empresa.gupy.io/jobs/1'],
      ['web', 'https://example.com/vaga'],
    ]);
  });

  it('atualização: só conta transição quando o status muda e fase quando a fase muda', async () => {
    const application = makeRestoredApplication();

    await repository.create(application, USER_ID);

    const useCase = new UpdateApplicationUseCase(repository, metrics);

    await useCase.execute({
      userId: USER_ID,
      id: application.id,
      title: 'Novo título',
    });
    expect(metrics.calls).toEqual([]);

    await useCase.execute({
      userId: USER_ID,
      id: application.id,
      status: ApplicationStatus.IN_PROGRESS,
      channel: 'agent_token',
    });
    await useCase.execute({
      userId: USER_ID,
      id: application.id,
      currentPhase: 'Teste prático',
    });
    await useCase.execute({
      userId: USER_ID,
      id: application.id,
      status: ApplicationStatus.IN_PROGRESS,
      currentPhase: 'Teste prático',
    });

    expect(metrics.of('applicationTransition')).toEqual([
      ['PENDING', 'IN_PROGRESS', 'agent_token'],
    ]);
    expect(metrics.of('applicationPhaseUpdated')).toEqual([['web']]);
  });

  it('mover entre colunas conta transição e reordenação; mover na mesma coluna só reordenação', async () => {
    const application = makeRestoredApplication();

    await repository.create(application, USER_ID);

    const useCase = new PlaceApplicationUseCase(repository, metrics);

    await useCase.execute({
      userId: USER_ID,
      applicationId: application.id,
      status: ApplicationStatus.COMPLETED,
      channel: 'agent_oauth',
    });
    await useCase.execute({
      userId: USER_ID,
      applicationId: application.id,
      status: ApplicationStatus.COMPLETED,
    });

    expect(metrics.of('applicationTransition')).toEqual([
      ['PENDING', 'COMPLETED', 'agent_oauth'],
    ]);
    expect(metrics.of('applicationReordered')).toEqual([
      ['agent_oauth'],
      ['web'],
    ]);
  });

  it('exclusão lógica e física', async () => {
    const soft = makeRestoredApplication();
    const hard = makeRestoredApplication();

    await repository.create(soft, USER_ID);
    await repository.create(hard, USER_ID);

    const useCase = new DeleteApplicationUseCase(repository, metrics);

    await useCase.execute({ userId: USER_ID, id: soft.id });
    await useCase.execute({ userId: USER_ID, id: hard.id, mode: 'hard' });

    expect(metrics.of('applicationDeleted')).toEqual([['soft'], ['hard']]);
  });

  it('pré-visualização: resultado, fonte e duração; falhas incluídas', async () => {
    const results: JobPageFetchResult[] = [
      {
        ok: true,
        finalUrl: 'https://x.com/1',
        html: '<meta property="og:title" content="Vaga | Acme">',
      },
      { ok: false, reason: 'blocked' },
      { ok: false, reason: 'timeout' },
    ];
    let index = 0;
    const fetcher = new (class extends JobPageFetcher {
      fetch(): Promise<JobPageFetchResult> {
        return Promise.resolve(results[index++]);
      }
    })();
    const useCase = new PreviewJobPostingUseCase(fetcher, metrics);

    for (let i = 0; i < results.length; i += 1) {
      await useCase.execute(`https://boards.greenhouse.io/acme/${i}`);
    }

    expect(metrics.of('jobPreview').map(([status]) => status)).toEqual([
      'found',
      'blocked',
      'timeout',
    ]);
    expect(
      metrics
        .of('jobPreview')
        .every(([, , seconds]) => typeof seconds === 'number'),
    ).toBe(true);
  });
});

describe('canal da requisição', () => {
  const request = (authMethod?: string) =>
    ({
      user: authMethod ? { authMethod } : undefined,
    }) as unknown as AuthenticatedRequest;

  it.each([
    ['jwt', 'web'],
    ['pat', 'agent_token'],
    ['oauth', 'agent_oauth'],
    [undefined, 'web'],
  ])('%s -> %s', (authMethod, channel) => {
    expect(channelOf(request(authMethod))).toBe(channel);
  });
});
