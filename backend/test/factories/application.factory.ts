import { randomUUID } from 'node:crypto';
import {
  Application,
  CreateApplicationProps,
  RestoreApplicationProps,
} from '../../src/domain/applications/entities/application.entity';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';

export function makeApplication(
  overrides: Partial<CreateApplicationProps> = {},
): Application {
  return Application.create({
    title: 'Backend Engineer',
    link: 'https://example.com/jobs/backend-engineer',
    company: 'Nubank',
    currentPhase: 'Triagem',
    ...overrides,
  });
}

export function makeRestoredApplication(
  overrides: Partial<RestoreApplicationProps> = {},
): Application {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');

  return Application.restore({
    id: randomUUID(),
    title: 'Backend Engineer',
    link: 'https://example.com/jobs/backend-engineer',
    company: 'Nubank',
    companyUrl: null,
    position: 0,
    status: ApplicationStatus.PENDING,
    currentPhase: 'Triagem',
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    ...overrides,
  });
}
