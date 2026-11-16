import { describe, expect, it } from 'vitest';
import { PromAppMetrics } from '../../src/infrastructure/metrics/prom-app-metrics';

async function sample(metrics: PromAppMetrics, name: string) {
  const all = await metrics.registry.getMetricsAsJSON();

  return all.find((metric) => metric.name === name)?.values ?? [];
}

describe('PromAppMetrics', () => {
  it('conta eventos com os rótulos certos', async () => {
    const metrics = new PromAppMetrics();

    metrics.loginAttempted('password', 'success');
    metrics.loginAttempted('password', 'success');
    metrics.loginAttempted('google', 'invalid_credentials');
    metrics.applicationCreated(
      'agent_oauth',
      'https://boards.greenhouse.io/x/1',
    );
    metrics.applicationTransition('PENDING', 'IN_PROGRESS', 'web');

    expect(await sample(metrics, 'trampo_auth_login_attempts_total')).toEqual([
      { value: 2, labels: { method: 'password', result: 'success' } },
      { value: 1, labels: { method: 'google', result: 'invalid_credentials' } },
    ]);
    expect(await sample(metrics, 'trampo_applications_created_total')).toEqual([
      { value: 1, labels: { channel: 'agent_oauth', source: 'greenhouse' } },
    ]);
    expect(
      await sample(metrics, 'trampo_applications_transitions_total'),
    ).toEqual([
      {
        value: 1,
        labels: { from: 'PENDING', to: 'IN_PROGRESS', channel: 'web' },
      },
    ]);
  });

  it('valor fora da lista fechada vira "other": nunca cria série nova', async () => {
    const metrics = new PromAppMetrics();

    for (let i = 0; i < 500; i += 1) {
      metrics.loginAttempted('password', `resultado-${i}` as never);
      metrics.guardDenied(`motivo-${i}` as never, `auth-${i}` as never);
      metrics.applicationTransition(
        `de-${i}` as never,
        `para-${i}` as never,
        `canal-${i}` as never,
      );
    }

    expect(
      await sample(metrics, 'trampo_auth_login_attempts_total'),
    ).toHaveLength(1);
    expect(
      await sample(metrics, 'trampo_auth_guard_denials_total'),
    ).toHaveLength(1);
    expect(
      await sample(metrics, 'trampo_applications_transitions_total'),
    ).toHaveLength(1);
  });

  it('o host da vaga e a chave do limitador nunca viram rótulo', async () => {
    const metrics = new PromAppMetrics();

    metrics.applicationCreated(
      'web',
      'https://secreto-da-empresa.example.com/vaga/1',
    );
    metrics.jobPreview('found', 'https://outra-empresa.example.com/x', 0.2);
    metrics.rateLimited('google:ip:203.0.113.9');
    metrics.rateLimited('oauth:token:client:https://claude.ai/oauth/x');

    const text = await metrics.registry.metrics();

    expect(text).not.toContain('secreto-da-empresa');
    expect(text).not.toContain('outra-empresa');
    expect(text).not.toContain('203.0.113.9');
    expect(text).not.toContain('claude.ai');
    expect(text).toContain('source="other"');
    expect(text).toContain('rule="google"');
    expect(text).toContain('rule="oauth_token"');
  });

  it('nunca lança, mesmo com valores absurdos', () => {
    const metrics = new PromAppMetrics();

    expect(() => {
      metrics.jobPreview('found', 'não é url', Number.NaN);
      metrics.mailSent('verification', 'ok', -1);
      metrics.oauthCleanup({ tabela_inventada: 5, codes: 2 });
    }).not.toThrow();
  });

  it('a saída não tem dado pessoal: sem e-mail, token, UUID ou URL nos rótulos', async () => {
    const metrics = new PromAppMetrics();

    metrics.loginAttempted('password', 'success');
    metrics.personalToken('created', 'read_write');
    metrics.oauthCimdFetch('ok', 0.1);
    metrics.oauthAuthorization('approved', 'claude', 'cimd');
    metrics.applicationCreated('web', 'https://www.linkedin.com/jobs/1');

    const labels = (await metrics.registry.metrics())
      .split('\n')
      .filter((line) => line.startsWith('trampo_'))
      .join('\n');

    expect(labels).not.toMatch(/@/);
    expect(labels).not.toMatch(/tf[por]_/);
    expect(labels).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(labels).not.toMatch(/https?:\/\//);
  });

  it('expõe a versão em trampo_build_info', async () => {
    const metrics = new PromAppMetrics();
    const [build] = await sample(metrics, 'trampo_build_info');

    expect(build?.value).toBe(1);
    expect(build?.labels).toMatchObject({
      version: expect.any(String) as string,
    });
  });

  it('inclui as métricas padrão do Node (event loop, memória)', async () => {
    const text = await new PromAppMetrics().registry.metrics();

    expect(text).toContain('nodejs_eventloop_lag_seconds');
    expect(text).toContain('process_resident_memory_bytes');
  });
});
