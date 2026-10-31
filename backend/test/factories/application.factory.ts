import { randomUUID } from 'node:crypto';
import {
  Application,
  CreateApplicationProps,
  RestoreApplicationProps,
} from '../../src/domain/applications/entities/application.entity';
import {
  ApplicationFile,
  CreateApplicationFileInput,
} from '../../src/domain/applications/entities/application-file.entity';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';

export function makeApplicationFileInput(
  overrides: Partial<CreateApplicationFileInput> = {},
): CreateApplicationFileInput {
  return {
    name: 'resume.pdf',
    url: 'https://storage.example.com/resume.pdf',
    mimeType: 'application/pdf',
    sizeInBytes: 1024,
    ...overrides,
  };
}

export function makeApplicationFile(
  overrides: Partial<CreateApplicationFileInput> = {},
): ApplicationFile {
  return ApplicationFile.create(makeApplicationFileInput(overrides));
}

export function makeApplication(
  overrides: Partial<CreateApplicationProps> = {},
): Application {
  return Application.create({
    title: 'Backend Engineer',
    link: 'https://example.com/jobs/backend-engineer',
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
    status: ApplicationStatus.PENDING,
    currentPhase: 'Triagem',
    files: [],
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    ...overrides,
  });
}
