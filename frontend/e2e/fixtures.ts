import type {
  Application,
  ApplicationBoard,
  ApplicationStatus,
} from '../src/services/applications.types';

export const visualUser = {
  id: 'user-visual',
  email: 'ana@trampo.test',
  firstName: 'Ana',
  lastName: 'Souza',
  emailVerified: true,
  hasPassword: true,
  termsAccepted: true,
  themePreference: 'light',
  verificationResendAvailableAt: null,
};

type ApplicationSeed = {
  id: string;
  title: string;
  company: string;
  status: ApplicationStatus;
  currentPhase: string;
  link?: string;
  companyUrl?: string | null;
  updatedAt?: string;
  position?: number;
};

function seedApplication({
  id,
  title,
  company,
  status,
  currentPhase,
  link = 'https://example.com/vagas',
  companyUrl = null,
  updatedAt = '2026-11-03T15:00:00.000Z',
  position = 1000,
}: ApplicationSeed): Application {
  return {
    id,
    title,
    company,
    companyUrl,
    link,
    status,
    currentPhase,
    position,
    createdAt: '2026-10-28T15:00:00.000Z',
    updatedAt,
    deletedAt: null,
  };
}

const pending = [
  seedApplication({
    id: 'a1',
    title: 'Product Designer',
    company: 'Nubank',
    companyUrl: 'https://nubank.com.br',
    link: 'https://nubank.com.br/vagas/product-designer',
    status: 'PENDING',
    currentPhase: 'Triagem',
  }),
  seedApplication({
    id: 'a2',
    title: 'Frontend Engineer',
    company: 'iFood',
    link: 'https://ifood.com.br/vagas/frontend',
    status: 'PENDING',
    currentPhase: 'Currículo enviado',
    updatedAt: '2026-11-01T15:00:00.000Z',
  }),
  seedApplication({
    id: 'a3',
    title: 'Data Analyst',
    company: 'Stone',
    link: 'https://stone.com.br/vagas/data-analyst',
    status: 'PENDING',
    currentPhase: 'Triagem',
    updatedAt: '2026-10-30T15:00:00.000Z',
  }),
];

const inProgress = [
  seedApplication({
    id: 'a4',
    title: 'UX Writer',
    company: 'Loft',
    link: 'https://loft.com.br/vagas/ux-writer',
    status: 'IN_PROGRESS',
    currentPhase: 'Entrevista RH',
  }),
  seedApplication({
    id: 'a5',
    title: 'Backend Developer',
    company: 'Mercado Livre',
    link: 'https://mercadolivre.com.br/vagas/backend',
    status: 'IN_PROGRESS',
    currentPhase: 'Teste técnico',
    updatedAt: '2026-10-29T15:00:00.000Z',
  }),
];

const completed = [
  seedApplication({
    id: 'a6',
    title: 'Product Manager',
    company: 'Hotmart',
    link: 'https://hotmart.com/vagas/product-manager',
    status: 'COMPLETED',
    currentPhase: 'Proposta',
    updatedAt: '2026-10-20T15:00:00.000Z',
  }),
];

const rejected = [
  seedApplication({
    id: 'a7',
    title: 'Design Lead',
    company: 'Gympass',
    link: 'https://gympass.com/vagas/design-lead',
    status: 'REJECTED',
    currentPhase: 'Feedback',
    updatedAt: '2026-10-15T15:00:00.000Z',
  }),
  seedApplication({
    id: 'a8',
    title: 'Full Stack Developer',
    company: 'XP Inc.',
    link: 'https://xpinc.com.br/vagas/full-stack',
    status: 'REJECTED',
    currentPhase: 'Sem retorno',
    updatedAt: '2026-10-01T15:00:00.000Z',
  }),
];

export const boardFixture: ApplicationBoard = {
  columns: [
    {
      status: 'PENDING',
      total: pending.length,
      items: pending,
      hasMore: false,
    },
    {
      status: 'IN_PROGRESS',
      total: inProgress.length,
      items: inProgress,
      hasMore: false,
    },
    {
      status: 'COMPLETED',
      total: completed.length,
      items: completed,
      hasMore: false,
    },
    {
      status: 'REJECTED',
      total: rejected.length,
      items: rejected,
      hasMore: false,
    },
  ],
};

export const emptyBoardFixture: ApplicationBoard = {
  columns: [
    { status: 'PENDING', total: 0, items: [], hasMore: false },
    { status: 'IN_PROGRESS', total: 0, items: [], hasMore: false },
    { status: 'COMPLETED', total: 0, items: [], hasMore: false },
    { status: 'REJECTED', total: 0, items: [], hasMore: false },
  ],
};

export const detailFixture = pending[0];
