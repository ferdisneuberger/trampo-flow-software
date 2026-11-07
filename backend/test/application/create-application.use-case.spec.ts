import { beforeEach, describe, expect, it } from 'vitest';
import {
  CreateApplicationInput,
  CreateApplicationUseCase,
} from '../../src/application/applications/use-cases/create-application.use-case';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { User } from '../../src/domain/users/entities/user.entity';
import { InMemoryApplicationRepository } from '../repositories/in-memory-application.repository';
import { InMemoryUserRepository } from '../repositories/in-memory-user.repository';

const validInput: CreateApplicationInput = {
  userId: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
  title: 'Backend Engineer',
  link: 'https://example.com/jobs/backend-engineer',
  company: 'Nubank',
  currentPhase: 'Triagem',
};

const USER_ID = '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10';
const UNVERIFIED_USER_ID = 'b1e2d3c4-5f60-4a7b-8c9d-0e1f2a3b4c5d';
const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdA==$a2V5';
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

function makeUser(id: string, verified: boolean): User {
  return User.restore({
    id,
    email: `${id}@example.com`,
    firstName: null,
    lastName: null,
    emailVerifiedAt: verified ? CREATED_AT : null,
    verificationSentAt: null,
    termsAcceptedAt: null,
    termsVersion: null,
    username: null,
    googleId: null,
    passwordHash: PASSWORD_HASH,
    lastLoginAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });
}

describe('CreateApplicationUseCase', () => {
  let repository: InMemoryApplicationRepository;
  let userRepository: InMemoryUserRepository;
  let useCase: CreateApplicationUseCase;

  beforeEach(async () => {
    repository = new InMemoryApplicationRepository();
    userRepository = new InMemoryUserRepository();
    await userRepository.create(makeUser(USER_ID, true));
    await userRepository.create(makeUser(UNVERIFIED_USER_ID, false));
    useCase = new CreateApplicationUseCase(repository, userRepository);
  });

  it('bloqueia a criação quando o e-mail não foi verificado', async () => {
    await expect(
      useCase.execute({ ...validInput, userId: UNVERIFIED_USER_ID }),
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });

    expect(repository.count).toBe(0);
  });

  it('creates an application with the default status and persists it', async () => {
    const application = await useCase.execute({
      userId: USER_ID,
      title: '  Backend Engineer  ',
      link: '  https://example.com/jobs/backend-engineer  ',
      company: '  Nubank  ',
      currentPhase: '  Triagem  ',
    });

    expect(application.title).toBe('Backend Engineer');
    expect(application.link).toBe('https://example.com/jobs/backend-engineer');
    expect(application.currentPhase).toBe('Triagem');
    expect(application.status).toBe(ApplicationStatus.PENDING);
    expect(application.isDeleted).toBe(false);
    expect(application.deletedAt).toBeNull();
    expect(application.createdAt).toBeInstanceOf(Date);
    expect(application.updatedAt.getTime()).toBe(
      application.createdAt.getTime(),
    );

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored).not.toBeNull();
    expect(stored?.id).toBe(application.id);
    expect(stored?.title).toBe('Backend Engineer');
    expect(stored?.currentPhase).toBe('Triagem');
    expect(repository.count).toBe(1);
  });

  it('creates an application with an explicit status', async () => {
    const application = await useCase.execute({
      userId: USER_ID,
      title: 'Staff Engineer',
      link: 'https://example.com/jobs/staff-engineer',
      currentPhase: 'Entrevista com RH',
      company: 'Nubank',
      status: ApplicationStatus.IN_PROGRESS,
    });

    expect(application.status).toBe(ApplicationStatus.IN_PROGRESS);

    const stored = await repository.findById(application.id, USER_ID);

    expect(stored?.status).toBe(ApplicationStatus.IN_PROGRESS);
  });

  it.each<[string, Partial<CreateApplicationInput>]>([
    ['TITLE_REQUIRED', { title: '   ' }],
    ['TITLE_REQUIRED', { title: undefined }],
    ['TITLE_TOO_LONG', { title: 'a'.repeat(121) }],
    ['LINK_REQUIRED', { link: '   ' }],
    ['LINK_REQUIRED', { link: undefined }],
    ['INVALID_LINK', { link: 'not-a-url' }],
    ['INVALID_LINK', { link: 'ftp://example.com/jobs/1' }],
    ['LINK_TOO_LONG', { link: `https://example.com/${'a'.repeat(2048)}` }],
    ['CURRENT_PHASE_REQUIRED', { currentPhase: '   ' }],
    ['CURRENT_PHASE_REQUIRED', { currentPhase: undefined }],
    ['CURRENT_PHASE_TOO_LONG', { currentPhase: 'a'.repeat(121) }],
    ['INVALID_STATUS', { status: 'ARCHIVED' as ApplicationStatus }],
  ])(
    'rejects invalid input with %s and does not persist',
    async (code, overrides) => {
      await expect(
        useCase.execute({ ...validInput, ...overrides }),
      ).rejects.toMatchObject({ code });

      expect(repository.count).toBe(0);
    },
  );

  it('returns a DomainError for invalid input', async () => {
    await expect(
      useCase.execute({ ...validInput, title: '' }),
    ).rejects.toMatchObject({
      name: 'DomainError',
      code: 'TITLE_REQUIRED',
    });
  });

  it('anexa ao fim da coluna somando mil à maior posição', async () => {
    const first = await useCase.execute({ ...validInput });
    const second = await useCase.execute({ ...validInput });

    expect(first.position).toBe(1000);
    expect(second.position).toBe(2000);
  });
});
