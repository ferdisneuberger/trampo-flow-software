// Cria (ou atualiza) o usuário do E2E já verificado e com os termos aceitos,
// sem passar pelo cadastro nem por e-mail.
//
// Uso, a partir da raiz do repositório e com o stack de E2E no ar:
//   docker compose exec -T -e E2E_EMAIL=... -e E2E_PASSWORD=... api \
//     node --input-type=module < backend/scripts/create-e2e-user.mjs
//
// O script vai pelo stdin porque a imagem de runtime não inclui `scripts/`.
// O hash segue o mesmo formato de `src/infrastructure/auth/scrypt.ts`.
import { randomBytes, randomUUID, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaClient } from '@prisma/client';

const scryptAsync = promisify(scrypt);

const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 64 * 1024 * 1024;

// Trava de segurança: este script só cria contas de teste.
const ALLOWED_EMAIL = /^[^\s@]+@example\.com$/;

async function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scryptAsync(password.normalize('NFKC'), salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: MAX_MEMORY,
  });

  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

async function main() {
  const email = process.env.E2E_EMAIL?.trim().toLowerCase();
  const password = process.env.E2E_PASSWORD;
  const termsVersion = process.env.TERMS_VERSION?.trim() || '2026-11';

  if (!email || !ALLOWED_EMAIL.test(email)) {
    throw new Error('Defina E2E_EMAIL com um endereço @example.com.');
  }

  if (!password) {
    throw new Error('Defina E2E_PASSWORD.');
  }

  const prisma = new PrismaClient();
  const now = new Date();

  try {
    const data = {
      passwordHash: await hashPassword(password),
      emailVerifiedAt: now,
      termsAcceptedAt: now,
      termsVersion,
    };

    await prisma.user.upsert({
      where: { email },
      update: data,
      create: {
        id: randomUUID(),
        email,
        firstName: 'E2E',
        lastName: 'Teste',
        ...data,
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  console.log(`Usuário de E2E pronto: ${email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
