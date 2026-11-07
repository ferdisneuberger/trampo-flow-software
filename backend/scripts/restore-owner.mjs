import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const backupDirectory = resolve(scriptDirectory, '../../backups');

function toDate(value) {
  return value ? new Date(value) : null;
}

function findBackupFile() {
  if (process.env.OWNER_BACKUP_FILE) {
    return resolve(process.env.OWNER_BACKUP_FILE);
  }

  const files = readdirSync(backupDirectory)
    .filter((file) => file.startsWith('owner-') && file.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    throw new Error('Nenhum backup de owner encontrado em backups/.');
  }

  return resolve(backupDirectory, files[files.length - 1]);
}

function toUserData(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    emailVerifiedAt: toDate(user.emailVerifiedAt),
    verificationSentAt: toDate(user.verificationSentAt),
    termsAcceptedAt: toDate(user.termsAcceptedAt),
    termsVersion: user.termsVersion,
    username: user.username,
    googleId: user.googleId,
    passwordHash: user.passwordHash,
    themePreference: user.themePreference ?? 'light',
    lastLoginAt: toDate(user.lastLoginAt),
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

function toApplicationData(application) {
  return {
    id: application.id,
    userId: application.userId,
    title: application.title,
    link: application.link,
    company: application.company,
    companyUrl: application.companyUrl,
    position: application.position,
    status: application.status,
    currentPhase: application.currentPhase,
    createdAt: new Date(application.createdAt),
    updatedAt: new Date(application.updatedAt),
    deletedAt: toDate(application.deletedAt),
  };
}

async function main() {
  const file = findBackupFile();
  const snapshot = JSON.parse(readFileSync(file, 'utf8'));

  await prisma.$transaction(async (transaction) => {
    await transaction.user.deleteMany({
      where: { email: snapshot.user.email },
    });
    await transaction.user.create({ data: toUserData(snapshot.user) });

    for (const application of snapshot.applications) {
      await transaction.application.create({
        data: toApplicationData(application),
      });
    }
  });

  console.log(
    `Restaurado ${snapshot.user.email}: ${snapshot.applications.length} candidatura(s).`,
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
