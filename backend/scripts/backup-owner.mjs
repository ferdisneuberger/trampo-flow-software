import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();

  if (!email) {
    throw new Error('Defina OWNER_EMAIL.');
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error('Usuário não encontrado.');
  }

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  });
  const applicationIds = applications.map((application) => application.id);
  const files = applicationIds.length
    ? await prisma.applicationFile.findMany({
        where: { applicationId: { in: applicationIds } },
        orderBy: { uploadedAt: 'asc' },
      })
    : [];

  const snapshot = {
    createdAt: new Date().toISOString(),
    user,
    applications,
    files,
  };

  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const backupDirectory = resolve(scriptDirectory, '../../backups');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = resolve(
    backupDirectory,
    `owner-${email.replace(/[^a-z0-9]/gi, '_')}-${stamp}.json`,
  );

  mkdirSync(backupDirectory, { recursive: true });
  writeFileSync(file, JSON.stringify(snapshot, null, 2));

  console.log(
    `Backup de ${email}: ${applications.length} candidatura(s), ${files.length} arquivo(s).`,
  );
  console.log(file);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
