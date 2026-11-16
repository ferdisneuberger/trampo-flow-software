import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthorizationRequestValidator } from '../../src/application/oauth/services/authorization-request';
import { OAuthSettings } from '../../src/application/oauth/services/oauth-settings';
import { OAuthTokenIssuer } from '../../src/application/oauth/services/oauth-token-issuer';
import { AuthenticateOAuthAccessTokenUseCase } from '../../src/application/oauth/use-cases/authenticate-oauth-access-token.use-case';
import { DecideAuthorizationUseCase } from '../../src/application/oauth/use-cases/decide-authorization.use-case';
import { ExchangeAuthorizationCodeUseCase } from '../../src/application/oauth/use-cases/exchange-authorization-code.use-case';
import { RefreshOAuthTokenUseCase } from '../../src/application/oauth/use-cases/refresh-oauth-token.use-case';
import { RegisterOAuthClientUseCase } from '../../src/application/oauth/use-cases/register-oauth-client.use-case';
import { ResolveOAuthClientUseCase } from '../../src/application/oauth/use-cases/resolve-oauth-client.use-case';
import { RevokeOAuthGrantUseCase } from '../../src/application/oauth/use-cases/revoke-oauth-grant.use-case';
import { RevokeOAuthTokenUseCase } from '../../src/application/oauth/use-cases/revoke-oauth-token.use-case';
import { ListOAuthGrantsUseCase } from '../../src/application/oauth/use-cases/list-oauth-grants.use-case';
import { TokenHasher } from '../../src/domain/auth/services/token-hasher';
import { User } from '../../src/domain/users/entities/user.entity';
import { CryptoOAuthTokenGenerator } from '../../src/infrastructure/oauth/crypto-oauth-token-generator';
import { OAuthCleanupService } from '../../src/infrastructure/oauth/oauth-cleanup.service';
import { PrismaOAuthClientRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-oauth-client.repository';
import { PrismaOAuthCodeRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-oauth-code.repository';
import { PrismaOAuthGrantRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-oauth-grant.repository';
import { PrismaOAuthTokenRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-oauth-token.repository';
import { PrismaUserRepository } from '../../src/infrastructure/database/prisma/repositories/prisma-user.repository';
import type { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';
import { HmacTokenHasher } from '../../src/infrastructure/auth/hmac-token-hasher';
import {
  authorizeParams,
  CLAUDE_CALLBACK,
  FakeClientMetadataFetcher,
  pkcePair,
  RESOURCE,
} from '../helpers/oauth-fixture';
import {
  createTestPrisma,
  TEST_DATABASE_URL,
  truncateUserData,
} from '../helpers/test-database';

/**
 * Fluxo completo contra Postgres real: register → authorize → token → chamada
 * → refresh → revoke, mais cascade e unicidade do grant ativo.
 */
describe.skipIf(!TEST_DATABASE_URL)('OAuth em Postgres real', () => {
  let prisma: PrismaService;
  let userId: string;

  const settings = new OAuthSettings(
    true,
    'https://trampo.example.com',
    RESOURCE,
    [],
    3600_000,
    30 * 24 * 3600_000,
    60_000,
    1000,
    10_000,
  );

  function stack() {
    const clients = new PrismaOAuthClientRepository(prisma);
    const grants = new PrismaOAuthGrantRepository(prisma);
    const codes = new PrismaOAuthCodeRepository(prisma);
    const tokens = new PrismaOAuthTokenRepository(prisma);
    const hasher: TokenHasher = new HmacTokenHasher({
      get: () => 'h'.repeat(40),
    } as never);
    const generator = new CryptoOAuthTokenGenerator();
    const fetcher = new FakeClientMetadataFetcher();
    const resolve = new ResolveOAuthClientUseCase(clients, fetcher, settings);
    const validator = new AuthorizationRequestValidator(settings, resolve);
    const issuer = new OAuthTokenIssuer(tokens, generator, hasher, settings);

    return {
      clients,
      grants,
      codes,
      tokens,
      register: new RegisterOAuthClientUseCase(clients, generator, settings),
      decide: new DecideAuthorizationUseCase(
        validator,
        clients,
        grants,
        codes,
        generator,
        hasher,
        settings,
      ),
      exchange: new ExchangeAuthorizationCodeUseCase(
        codes,
        grants,
        clients,
        tokens,
        issuer,
        hasher,
        settings,
      ),
      refresh: new RefreshOAuthTokenUseCase(
        tokens,
        grants,
        clients,
        issuer,
        hasher,
        settings,
      ),
      revokeToken: new RevokeOAuthTokenUseCase(tokens, grants, hasher),
      revokeGrant: new RevokeOAuthGrantUseCase(grants, tokens),
      list: new ListOAuthGrantsUseCase(grants, clients),
      authenticate: new AuthenticateOAuthAccessTokenUseCase(
        tokens,
        grants,
        new PrismaUserRepository(prisma),
        hasher,
        settings,
      ),
      cleanup: new OAuthCleanupService(settings, codes, tokens, clients),
    };
  }

  async function createUser(): Promise<string> {
    const user = User.create({
      email: `${randomUUID()}@example.com`,
      firstName: 'Teste',
      lastName: 'OAuth',
      passwordHash: 'scrypt$16384$8$1$c2FsdA==$a2V5',
    });

    await new PrismaUserRepository(prisma).create(user);

    return user.id;
  }

  async function connect(s: ReturnType<typeof stack>, owner: string) {
    const registered = await s.register.execute({
      client_name: 'Claude',
      redirect_uris: [CLAUDE_CALLBACK],
    });
    const { verifier, challenge } = pkcePair();
    const { redirectTo } = await s.decide.execute({
      userId: owner,
      params: authorizeParams(registered.client_id, challenge),
      approve: true,
    });
    const code = new URL(redirectTo).searchParams.get('code') as string;
    const tokens = await s.exchange.execute({
      code,
      redirectUri: CLAUDE_CALLBACK,
      clientId: registered.client_id,
      codeVerifier: verifier,
      resource: RESOURCE,
    });

    return { clientId: registered.client_id, code, verifier, tokens };
  }

  beforeAll(async () => {
    prisma = await createTestPrisma();
  });

  beforeEach(async () => {
    await truncateUserData(prisma);
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "oauth_clients" RESTART IDENTITY CASCADE',
    );
    userId = await createUser();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('fluxo completo: register → authorize → token → chamada → refresh → revoke', async () => {
    const s = stack();
    const { clientId, tokens } = await connect(s, userId);
    const auth = await s.authenticate.execute(tokens.access_token);

    expect(auth).toMatchObject({
      userId,
      scopes: ['applications:read', 'applications:write'],
    });

    const next = await s.refresh.execute({
      refreshToken: tokens.refresh_token,
      clientId,
    });

    expect(next.refresh_token).not.toBe(tokens.refresh_token);
    await expect(
      s.authenticate.execute(next.access_token),
    ).resolves.toBeDefined();

    await s.revokeToken.execute(next.refresh_token);

    await expect(s.authenticate.execute(next.access_token)).rejects.toThrow();
    await expect(
      s.refresh.execute({ refreshToken: next.refresh_token, clientId }),
    ).rejects.toMatchObject({ code: 'invalid_grant' });
  });

  it('só guarda HMAC: nenhum segredo aparece nas tabelas', async () => {
    const s = stack();
    const { tokens, code } = await connect(s, userId);
    const dump = JSON.stringify([
      await prisma.oAuthAccessToken.findMany(),
      await prisma.oAuthRefreshToken.findMany(),
      await prisma.oAuthCode.findMany(),
    ]);

    for (const secret of [tokens.access_token, tokens.refresh_token, code]) {
      expect(dump).not.toContain(secret);
    }
  });

  it('código usado duas vezes: o segundo falha e o grant cai com todos os tokens', async () => {
    const s = stack();
    const { clientId, code, verifier, tokens } = await connect(s, userId);

    await expect(
      s.exchange.execute({
        code,
        redirectUri: CLAUDE_CALLBACK,
        clientId,
        codeVerifier: verifier,
      }),
    ).rejects.toMatchObject({ code: 'invalid_grant' });
    await expect(s.authenticate.execute(tokens.access_token)).rejects.toThrow();
    expect(await prisma.oAuthGrant.count({ where: { revokedAt: null } })).toBe(
      0,
    );
  });

  it('troca atômica: dois /token simultâneos com o mesmo código, só um vence', async () => {
    const s = stack();
    const registered = await s.register.execute({
      client_name: 'Claude',
      redirect_uris: [CLAUDE_CALLBACK],
    });
    const { verifier, challenge } = pkcePair();
    const { redirectTo } = await s.decide.execute({
      userId,
      params: authorizeParams(registered.client_id, challenge),
      approve: true,
    });
    const code = new URL(redirectTo).searchParams.get('code') as string;
    const input = {
      code,
      redirectUri: CLAUDE_CALLBACK,
      clientId: registered.client_id,
      codeVerifier: verifier,
    };
    const results = await Promise.allSettled([
      s.exchange.execute(input),
      s.exchange.execute(input),
      s.exchange.execute(input),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('unicidade do grant ativo: reautorizar reaproveita; duas autorizações simultâneas não duplicam', async () => {
    const s = stack();
    const registered = await s.register.execute({
      client_name: 'Claude',
      redirect_uris: [CLAUDE_CALLBACK],
    });
    const client = await s.clients.findByClientId(registered.client_id);
    const input = {
      userId,
      clientRef: client!.id,
      scope: 'applications:read',
      resource: RESOURCE,
    };

    await Promise.all([
      s.grants.activate(input),
      s.grants.activate(input),
      s.grants.activate(input),
    ]);
    expect(await prisma.oAuthGrant.count()).toBe(1);

    // Depois de revogado, um novo grant ativo pode existir (índice parcial).
    const [grant] = await s.grants.listActiveByUser(userId);

    await s.grants.revoke(grant.id, new Date());
    await s.grants.activate(input);
    expect(await prisma.oAuthGrant.count()).toBe(2);
    expect(await prisma.oAuthGrant.count({ where: { revokedAt: null } })).toBe(
      1,
    );
  });

  it('o índice parcial barra dois grants ativos inseridos direto no banco', async () => {
    const s = stack();
    const registered = await s.register.execute({
      client_name: 'Claude',
      redirect_uris: [CLAUDE_CALLBACK],
    });
    const client = await s.clients.findByClientId(registered.client_id);
    const row = () => ({
      id: randomUUID(),
      userId,
      clientRef: client!.id,
      scope: 'applications:read',
      resource: RESOURCE,
    });

    await prisma.oAuthGrant.create({ data: row() });
    await expect(prisma.oAuthGrant.create({ data: row() })).rejects.toThrow();
  });

  it('apagar o usuário leva grants, códigos e tokens em cascata (o cliente DCR fica)', async () => {
    const s = stack();

    await connect(s, userId);
    await prisma.user.delete({ where: { id: userId } });

    expect(await prisma.oAuthGrant.count()).toBe(0);
    expect(await prisma.oAuthCode.count()).toBe(0);
    expect(await prisma.oAuthAccessToken.count()).toBe(0);
    expect(await prisma.oAuthRefreshToken.count()).toBe(0);
    expect(await prisma.oAuthClient.count()).toBe(1);
  });

  it('revogar o grant de outra pessoa não faz nada; a limpeza remove o vencido', async () => {
    const s = stack();
    const other = await createUser();

    await connect(s, userId);

    const [grant] = await s.list.execute(userId);

    await expect(
      s.revokeGrant.execute({ userId: other, grantId: grant.id }),
    ).rejects.toMatchObject({ code: 'OAUTH_GRANT_NOT_FOUND' });

    await s.cleanup.runOnce(new Date(Date.now() + 40 * 24 * 3600_000));
    expect(await prisma.oAuthCode.count()).toBe(0);
    expect(await prisma.oAuthAccessToken.count()).toBe(0);
    expect(await prisma.oAuthRefreshToken.count()).toBe(0);
    // O cliente tem grant (de userId): não é removido.
    expect(await prisma.oAuthClient.count()).toBe(1);
  });

  it('reuso do refresh fora da janela revoga a família no banco', async () => {
    const s = stack();
    const { clientId, tokens } = await connect(s, userId);
    const second = await s.refresh.execute({
      refreshToken: tokens.refresh_token,
      clientId,
    });

    // Envelhece a rotação para fora da janela de graça.
    await prisma.oAuthRefreshToken.updateMany({
      where: { revokedAt: { not: null } },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });

    await expect(
      s.refresh.execute({ refreshToken: tokens.refresh_token, clientId }),
    ).rejects.toMatchObject({ code: 'invalid_grant' });
    await expect(
      s.refresh.execute({ refreshToken: second.refresh_token, clientId }),
    ).rejects.toMatchObject({ code: 'invalid_grant' });
  });
});
