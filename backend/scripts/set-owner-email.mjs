import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const username = process.env.OWNER_USERNAME?.trim().toLowerCase();

  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new Error('Defina OWNER_EMAIL com um e-mail válido.');
  }

  const user = username
    ? await prisma.user.findUnique({ where: { username } })
    : await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!user) {
    throw new Error('Nenhum usuário encontrado para atualizar.');
  }

  const conflict = await prisma.user.findFirst({
    where: {
      email,
      id: { not: user.id },
    },
  });

  if (conflict) {
    throw new Error('Já existe outro usuário com esse e-mail.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email,
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
  });

  console.log(`Usuário ${user.id} atualizado para ${email}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
