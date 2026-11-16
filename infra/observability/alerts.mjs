/**
 * Regras de alerta do Grafana (Grafana-managed) para o Trampo Flow. Fonte
 * única: `build.mjs` gera o JSON de provisionamento a partir daqui. Os limiares
 * são o ponto de partida; ajuste com o uso real.
 *
 * Todas as consultas protegem contra ruído de baixo volume (por exemplo, exigem
 * um número mínimo de eventos antes de comparar uma proporção), porque o
 * Trampo Flow tem pouco tráfego.
 */
const API = 'job="trampo-flow-api"';
const MCP = 'job="trampo-flow-mcp"';

/**
 * @typedef {object} AlertSpec
 * @property {string} uid
 * @property {string} title
 * @property {string} expr             PromQL (instantânea) que devolve o valor a comparar
 * @property {number} threshold
 * @property {'gt'|'lt'} [comparison]
 * @property {string} for              duração antes de disparar
 * @property {'critical'|'high'|'medium'|'low'} severity
 * @property {string} summary
 * @property {string} description
 * @property {'OK'|'Alerting'|'NoData'} [noData] estado quando a consulta não devolve série
 */

/** @type {AlertSpec[]} */
export const ALERTS = [
  {
    uid: 'trampo-api-down',
    title: 'Trampo Flow: API fora do ar',
    expr: `min(up{${API}})`,
    comparison: 'lt',
    threshold: 1,
    for: '2m',
    severity: 'critical',
    noData: 'Alerting',
    summary: 'A API do Trampo Flow não está sendo raspada pelo Prometheus.',
    description:
      'O alvo `trampo-flow-api` está fora ou sem resposta há mais de 2 minutos. Confira `docker compose ps`, o log da API e o Traefik.',
  },
  {
    uid: 'trampo-mcp-down',
    title: 'Trampo Flow: MCP fora do ar',
    expr: `min(up{${MCP}})`,
    comparison: 'lt',
    threshold: 1,
    for: '2m',
    severity: 'high',
    noData: 'Alerting',
    summary: 'O serviço MCP do Trampo Flow não está sendo raspado.',
    description:
      'O alvo `trampo-flow-mcp` está fora há mais de 2 minutos: o conector do Claude e os agentes ficam sem acesso.',
  },
  {
    uid: 'trampo-db-down',
    title: 'Trampo Flow: banco de dados fora',
    expr: `min(trampo_db_up{${API}})`,
    comparison: 'lt',
    threshold: 1,
    for: '1m',
    severity: 'critical',
    summary: 'A API não consegue consultar o banco.',
    description:
      'A sonda `SELECT 1` da API falha há mais de 1 minuto. O `/health` responde 503 e nada funciona sem o Postgres.',
  },
  {
    uid: 'trampo-5xx-ratio',
    title: 'Trampo Flow: erros 5xx acima de 2%',
    expr: `(sum(increase(trampo_http_requests_total{${API},status=~"5.."}[5m])) / clamp_min(sum(increase(trampo_http_requests_total{${API}}[5m])), 1)) and on() (sum(increase(trampo_http_requests_total{${API},status=~"5.."}[5m])) >= 3)`,
    threshold: 0.02,
    for: '5m',
    severity: 'high',
    summary: 'Mais de 2% das respostas da API são 5xx.',
    description:
      'Pelo menos 3 erros 5xx e mais de 2% das respostas nos últimos 5 minutos. Veja o painel "Requisições HTTP" e o log da API.',
  },
  {
    uid: 'trampo-latency-p95',
    title: 'Trampo Flow: latência alta (p95 acima de 1 s)',
    expr: `max(histogram_quantile(0.95, sum by (le, route) (rate(trampo_http_request_duration_seconds_bucket{${API}}[10m]))) and on (route) (sum by (route) (increase(trampo_http_request_duration_seconds_count{${API}}[10m])) >= 10))`,
    threshold: 1,
    for: '10m',
    severity: 'medium',
    summary: 'O p95 de alguma rota passou de 1 segundo.',
    description:
      'Uma rota com pelo menos 10 requisições em 10 minutos tem p95 acima de 1 s. Veja a latência por rota e as consultas ao banco.',
  },
  {
    uid: 'trampo-session-reuse',
    title: 'Trampo Flow: sessão reutilizada (possível roubo)',
    expr: `sum(increase(trampo_auth_session_refreshes_total{${API},result="reused"}[10m]))`,
    threshold: 0,
    for: '0s',
    severity: 'high',
    summary: 'Um refresh token de sessão foi reutilizado.',
    description:
      'Reutilizar um refresh token já rotacionado, fora da janela de graça, indica que a credencial pode ter sido roubada. A família de sessões é revogada; avise o usuário.',
  },
  {
    uid: 'trampo-oauth-reuse',
    title: 'Trampo Flow: código ou refresh OAuth reutilizado',
    expr: `sum(increase(trampo_oauth_code_reuse_total{${API}}[10m])) + sum(increase(trampo_oauth_refresh_reuse_total{${API}}[10m]))`,
    threshold: 0,
    for: '0s',
    severity: 'high',
    summary: 'Um código de autorização ou refresh token OAuth foi reutilizado.',
    description:
      'Sinal de roubo de credencial no fluxo OAuth: o grant é revogado (código) ou a família de refresh (refresh). Confira "Aplicativos conectados" do usuário.',
  },
  {
    uid: 'trampo-bruteforce',
    title: 'Trampo Flow: possível força bruta no login',
    expr: `sum(increase(trampo_auth_login_attempts_total{${API},result="invalid_credentials"}[5m]))`,
    threshold: 30,
    for: '0s',
    severity: 'medium',
    summary: 'Mais de 30 logins com senha errada em 5 minutos.',
    description:
      'Volume anormal de credenciais inválidas. Confira se o limitador de login travou e se há um IP concentrando as tentativas no Traefik/Cloudflare.',
  },
  {
    uid: 'trampo-login-lockout',
    title: 'Trampo Flow: login travado pelo limitador',
    expr: `sum(increase(trampo_auth_login_lockouts_total{${API}}[10m]))`,
    threshold: 0,
    for: '0s',
    severity: 'medium',
    summary: 'O limitador global de login travou.',
    description:
      'O limitador de login tem um estado global: enquanto travado, **ninguém** consegue entrar. Pode ser um ataque ou um usuário errando a senha.',
  },
  {
    uid: 'trampo-registrations-spike',
    title: 'Trampo Flow: pico de cadastros',
    expr: `sum(increase(trampo_auth_registrations_total{${API},result="created"}[1h]))`,
    threshold: 20,
    for: '0s',
    severity: 'medium',
    summary: 'Mais de 20 cadastros em 1 hora.',
    description:
      'Volume anormal de contas novas: pode ser divulgação ou abuso. Confira `REGISTRATION_ENABLED` e o log de cadastros.',
  },
  {
    uid: 'trampo-mail-failing',
    title: 'Trampo Flow: falha no envio de e-mail',
    expr: `sum(increase(trampo_mail_sent_total{${API},result="error"}[15m]))`,
    threshold: 3,
    for: '0s',
    severity: 'high',
    summary: 'Mais de 3 e-mails falharam em 15 minutos.',
    description:
      'Sem o e-mail de verificação ninguém ativa a conta. Confira `SMTP_*` e o log da API ("Falha no envio SMTP").',
  },
  {
    uid: 'trampo-preview-degraded',
    title: 'Trampo Flow: preenchimento pelo link degradado',
    expr: `(sum(increase(trampo_job_preview_total{${API},status!="found"}[1h])) / clamp_min(sum(increase(trampo_job_preview_total{${API}}[1h])), 1)) and on() (sum(increase(trampo_job_preview_total{${API}}[1h])) >= 10)`,
    threshold: 0.7,
    for: '1h',
    severity: 'low',
    summary: 'Mais de 70% das leituras de vagas falham.',
    description:
      'Pelo menos 10 tentativas na última hora e mais de 70% sem dados. Veja "Sites: leitura por fonte": algum site pode ter mudado.',
  },
  {
    uid: 'trampo-mcp-tool-errors',
    title: 'Trampo Flow: ferramentas do MCP com erros',
    expr: `(sum(increase(trampo_mcp_tool_calls_total{${MCP},result="error"}[15m])) / clamp_min(sum(increase(trampo_mcp_tool_calls_total{${MCP}}[15m])), 1)) and on() (sum(increase(trampo_mcp_tool_calls_total{${MCP}}[15m])) >= 5)`,
    threshold: 0.2,
    for: '0s',
    severity: 'medium',
    summary: 'Mais de 20% das chamadas de ferramenta do MCP deram erro.',
    description:
      'Pelo menos 5 chamadas em 15 minutos e mais de 20% com erro. Veja "Ferramentas: resultado" e as idas do MCP à API.',
  },
  {
    uid: 'trampo-oauth-token-errors',
    title: 'Trampo Flow: o fluxo OAuth não está conectando',
    expr: `(sum(increase(trampo_oauth_token_requests_total{${API},result!="ok"}[15m])) / clamp_min(sum(increase(trampo_oauth_token_requests_total{${API}}[15m])), 1)) and on() (sum(increase(trampo_oauth_token_requests_total{${API}}[15m])) >= 5)`,
    threshold: 0.5,
    for: '0s',
    severity: 'medium',
    summary: 'Mais de 50% das requisições ao /oauth/token falham.',
    description:
      'Pelo menos 5 requisições em 15 minutos e mais da metade com erro (`invalid_grant`, `invalid_request`...). Veja "Requisições ao /oauth/token".',
  },
  {
    uid: 'trampo-gauges-stale',
    title: 'Trampo Flow: estoques de negócio parados',
    expr: `time() - max(trampo_business_gauges_last_refresh_timestamp_seconds{${API}})`,
    threshold: 300,
    for: '5m',
    severity: 'medium',
    summary: 'Os estoques de negócio não atualizam há mais de 5 minutos.',
    description:
      'Os painéis de usuários ativos, funil e candidaturas estão desatualizados: a consulta agregada ao banco está falhando (`trampo_business_gauges_refresh_failures_total`).',
  },
  {
    uid: 'trampo-cleanup-stale',
    title: 'Trampo Flow: limpeza do OAuth parada',
    // `and on() (... > 0)` evita alerta quando o OAuth está desligado (métrica em 0).
    expr: `(time() - max(trampo_oauth_cleanup_last_success_timestamp_seconds{${API}})) and on() (max(trampo_oauth_cleanup_last_success_timestamp_seconds{${API}}) > 0)`,
    threshold: 7200,
    for: '0s',
    severity: 'medium',
    summary: 'A limpeza horária do OAuth não tem sucesso há mais de 2 horas.',
    description:
      'Códigos, tokens e clientes vencidos estão acumulando. Veja `trampo_oauth_cleanup_failures_total` e o log da API.',
  },
  {
    uid: 'trampo-eventloop',
    title: 'Trampo Flow: event loop saturado',
    expr: `max(nodejs_eventloop_lag_p99_seconds{job=~"trampo-flow-(api|mcp)"})`,
    threshold: 0.2,
    for: '5m',
    severity: 'medium',
    summary: 'O atraso do event loop (p99) passou de 200 ms.',
    description:
      'O processo Node da API ou do MCP está saturado: respostas lentas em todas as rotas. Veja CPU, memória e o painel "Banco e processos".',
  },
];

/** Monta as três etapas de uma regra do Grafana: consulta, redução e limiar. */
export function buildRule(spec, { datasourceUid, contactPoint }) {
  const query = {
    refId: 'A',
    relativeTimeRange: { from: 600, to: 0 },
    datasourceUid,
    model: {
      datasource: { type: 'prometheus', uid: datasourceUid },
      expr: spec.expr,
      instant: true,
      range: false,
      intervalMs: 1000,
      maxDataPoints: 43200,
      refId: 'A',
    },
  };
  const reduce = {
    refId: 'B',
    datasourceUid: '__expr__',
    model: {
      type: 'reduce',
      expression: 'A',
      reducer: 'last',
      settings: { mode: 'dropNN' },
      datasource: { type: '__expr__', uid: '__expr__' },
      refId: 'B',
    },
  };
  const threshold = {
    refId: 'C',
    datasourceUid: '__expr__',
    model: {
      type: 'threshold',
      expression: 'B',
      conditions: [
        {
          evaluator: {
            type: spec.comparison ?? 'gt',
            params: [spec.threshold],
          },
        },
      ],
      datasource: { type: '__expr__', uid: '__expr__' },
      refId: 'C',
    },
  };

  return {
    uid: spec.uid,
    title: spec.title,
    condition: 'C',
    data: [query, reduce, threshold],
    noDataState: spec.noData ?? 'OK',
    execErrState: 'Error',
    for: spec.for,
    annotations: { summary: spec.summary, description: spec.description },
    labels: { app: 'trampo-flow', severity: spec.severity },
    isPaused: false,
    notification_settings: { receiver: contactPoint },
  };
}
