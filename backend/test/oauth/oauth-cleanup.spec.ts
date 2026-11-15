import { describe, expect, it } from 'vitest';
import { OAuthCleanupService } from '../../src/infrastructure/oauth/oauth-cleanup.service';
import {
  authorize,
  buildOAuthStack,
  registerClient,
  tokenInput,
} from '../helpers/oauth-fixture';

const HOUR = 3600_000;
const DAY = 24 * HOUR;

describe('OAuthCleanupService', () => {
  it('apaga códigos, tokens e clientes DCR sem uso, e preserva o que vale', async () => {
    const stack = buildOAuthStack();
    const clientId = await registerClient(stack);
    const { code, verifier } = await authorize(stack, clientId);
    const tokens = await stack.exchange.execute(
      tokenInput(clientId, code, verifier),
    );
    const orphan = await registerClient(stack);
    const [client] = [...stack.clients.clients.values()];

    stack.clients.clientsWithGrants.add(client.id);

    const service = new OAuthCleanupService(
      stack.settings,
      stack.codes,
      stack.tokens,
      stack.clients,
    );

    // Agora: nada vencido, nada some.
    await service.runOnce(new Date());
    expect(stack.codes.codes.size).toBe(1);
    expect(stack.tokens.accessTokens.size).toBe(1);
    expect(stack.tokens.refreshTokens.size).toBe(1);
    expect(stack.clients.clients.size).toBe(2);

    // Daqui a 40 dias: código, access e refresh vencidos; só o DCR órfão sai.
    await service.runOnce(new Date(Date.now() + 40 * DAY));
    expect(stack.codes.codes.size).toBe(0);
    expect(stack.tokens.accessTokens.size).toBe(0);
    expect(stack.tokens.refreshTokens.size).toBe(0);
    expect([...stack.clients.clients.values()].map((c) => c.clientId)).toEqual([
      clientId,
    ]);
    expect(orphan).not.toBe(clientId);
    expect(tokens.access_token).toBeDefined();
  });

  it('não derruba o processo quando a limpeza falha', async () => {
    const stack = buildOAuthStack();
    const service = new OAuthCleanupService(
      stack.settings,
      {
        deleteExpiredBefore: async () => {
          throw new Error('banco fora');
        },
      } as never,
      stack.tokens,
      stack.clients,
    );

    await expect(service.runOnce()).resolves.toBeUndefined();
  });

  it('só agenda quando OAUTH_ENABLED=true', () => {
    const stack = buildOAuthStack();
    const disabled = { ...stack.settings, enabled: false } as never;
    const service = new OAuthCleanupService(
      disabled,
      stack.codes,
      stack.tokens,
      stack.clients,
    );

    service.onModuleInit();
    expect((service as unknown as { timer: unknown }).timer).toBeUndefined();

    const enabled = new OAuthCleanupService(
      stack.settings,
      stack.codes,
      stack.tokens,
      stack.clients,
    );

    enabled.onModuleInit();
    expect((enabled as unknown as { timer: unknown }).timer).toBeDefined();
    enabled.onModuleDestroy();
  });
});
