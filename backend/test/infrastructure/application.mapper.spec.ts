import { describe, expect, it } from 'vitest';
import { ApplicationStatus as PrismaApplicationStatus } from '@prisma/client';
import { ApplicationMapper } from '../../src/infrastructure/database/prisma/mappers/application.mapper';
import { PrismaApplicationRecord } from '../../src/infrastructure/database/prisma/mappers/application.mapper';
import { ApplicationStatus } from '../../src/domain/applications/enums/application-status.enum';
import { makeRestoredApplication } from '../factories/application.factory';

function makeRecord(
  overrides: Partial<PrismaApplicationRecord> = {},
): PrismaApplicationRecord {
  return {
    id: '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
    userId: 'b1e2d3c4-5f60-4a7b-8c9d-0e1f2a3b4c5d',
    title: 'Backend Engineer',
    link: 'https://example.com/jobs/backend',
    company: 'Nubank',
    companyUrl: 'https://nubank.com.br',
    position: 1000,
    status: PrismaApplicationStatus.IN_PROGRESS,
    currentPhase: 'Teste técnico',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('ApplicationMapper', () => {
  describe('toDomain', () => {
    it('converte o registro inteiro', () => {
      const application = ApplicationMapper.toDomain(makeRecord());

      expect(application.id).toBe('6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10');
      expect(application.status).toBe(ApplicationStatus.IN_PROGRESS);
      expect(application.currentPhase).toBe('Teste técnico');
    });

    it('preserva deletedAt como Date', () => {
      const deletedAt = new Date('2026-02-01T00:00:00.000Z');
      const application = ApplicationMapper.toDomain(makeRecord({ deletedAt }));

      expect(application.deletedAt).toEqual(deletedAt);
      expect(application.isDeleted).toBe(true);
    });

    it('converte todos os status do Prisma para o domínio', () => {
      const mappings: Array<[PrismaApplicationStatus, ApplicationStatus]> = [
        [PrismaApplicationStatus.PENDING, ApplicationStatus.PENDING],
        [PrismaApplicationStatus.IN_PROGRESS, ApplicationStatus.IN_PROGRESS],
        [PrismaApplicationStatus.COMPLETED, ApplicationStatus.COMPLETED],
        [PrismaApplicationStatus.REJECTED, ApplicationStatus.REJECTED],
      ];

      for (const [persisted, expected] of mappings) {
        expect(
          ApplicationMapper.toDomain(makeRecord({ status: persisted })).status,
        ).toBe(expected);
      }
    });
  });

  describe('toCreateData', () => {
    it('manda id, status e campos da candidatura', () => {
      const application = makeRestoredApplication({
        status: ApplicationStatus.COMPLETED,
      });

      const data = ApplicationMapper.toCreateData(application);

      expect(data.id).toBe(application.id);
      expect(data.status).toBe(PrismaApplicationStatus.COMPLETED);
      expect(data).not.toHaveProperty('files');
    });
  });

  describe('toUpdateData', () => {
    it('não inclui id nem createdAt', () => {
      const data = ApplicationMapper.toUpdateData(makeRestoredApplication());

      expect(data).not.toHaveProperty('id');
      expect(data).not.toHaveProperty('createdAt');
      expect(data).toHaveProperty('updatedAt');
    });
  });
});
