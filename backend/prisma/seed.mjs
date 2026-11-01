import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const samples = [
  {
    title: 'Backend Engineer - Nubank',
    link: 'https://example.com/jobs/nubank-backend',
    currentPhase: 'Teste técnico',
    status: 'IN_PROGRESS',
  },
  {
    title: 'Senior Node.js Developer - iFood',
    link: 'https://example.com/jobs/ifood-node',
    currentPhase: 'Entrevista com recrutador',
    status: 'IN_PROGRESS',
  },
  {
    title: 'Desenvolvedor Full Stack - Stone',
    link: 'https://example.com/jobs/stone-fullstack',
    currentPhase: 'Aguardando retorno',
    status: 'PENDING',
  },
  {
    title: 'Software Engineer - Mercado Livre',
    link: 'https://example.com/jobs/mercadolivre-swe',
    currentPhase: 'Aplicado pelo site',
    status: 'PENDING',
  },
  {
    title: 'Tech Lead - Loft',
    link: 'https://example.com/jobs/loft-tech-lead',
    currentPhase: 'Proposta em negociação',
    status: 'IN_PROGRESS',
  },
  {
    title: 'Backend Developer - QuintoAndar',
    link: 'https://example.com/jobs/quintoandar-backend',
    currentPhase: 'Oferta aceita',
    status: 'COMPLETED',
  },
  {
    title: 'Analista de Sistemas - Itaú',
    link: 'https://example.com/jobs/itau-analista',
    currentPhase: 'Contrato assinado',
    status: 'COMPLETED',
  },
  {
    title: 'Full Stack Engineer - Gympass',
    link: 'https://example.com/jobs/gympass-fullstack',
    currentPhase: 'Sem retorno após 30 dias',
    status: 'REJECTED',
  },
  {
    title: 'Node.js Developer - Creditas',
    link: 'https://example.com/jobs/creditas-node',
    currentPhase: 'Reprovado na entrevista técnica',
    status: 'REJECTED',
  },
  {
    title: 'Engenheiro de Software - Wildlife',
    link: 'https://example.com/jobs/wildlife-eng',
    currentPhase: 'Desafio de código enviado',
    status: 'IN_PROGRESS',
  },
  {
    title: 'Desenvolvedor Backend - PicPay',
    link: 'https://example.com/jobs/picpay-backend',
    currentPhase: 'Currículo enviado',
    status: 'PENDING',
  },
  {
    title: 'Staff Engineer - Hash',
    link: 'https://example.com/jobs/hash-staff',
    currentPhase: 'Processo encerrado pela empresa',
    status: 'REJECTED',
  },
];

async function main() {
  const existing = await prisma.application.count();

  if (existing > 0 && process.env.SEED_FORCE !== 'true') {
    console.log(
      `seed: banco já tem ${existing} candidatura(s), nada a fazer (use SEED_FORCE=true)`,
    );
    return;
  }

  const now = Date.now();

  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!user) {
    throw new Error(
      'seed: nenhum usuário encontrado. Suba a API uma vez com AUTH_USERNAME e AUTH_PASSWORD para criar o primeiro usuário.',
    );
  }

  await prisma.application.createMany({
    data: samples.map((sample, index) => ({
      id: randomUUID(),
      userId: user.id,
      ...sample,
      createdAt: new Date(now - index * 86_400_000),
      updatedAt: new Date(now - index * 86_400_000),
    })),
  });

  console.log(`seed: ${samples.length} candidaturas criadas`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
