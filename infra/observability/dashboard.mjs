/**
 * Dashboard do Trampo Flow para o Grafana. Fonte única: `build.mjs` gera o JSON
 * importável a partir daqui. Todas as consultas usam as métricas `trampo_*` do
 * `/metrics` da API (job `trampo-flow-api`) e do MCP (job `trampo-flow-mcp`).
 */
const DS = { type: 'prometheus', uid: '${datasource}' };
const API = 'job="trampo-flow-api"';
const MCP = 'job="trampo-flow-mcp"';

let panelId = 0;
let refCounter = 0;

function target(expr, legend = '', extra = {}) {
  refCounter += 1;

  return {
    datasource: DS,
    expr,
    legendFormat: legend,
    refId: String.fromCharCode(64 + ((refCounter - 1) % 26) + 1),
    ...extra,
  };
}

function thresholds(steps) {
  return {
    mode: 'absolute',
    steps: steps.map(([value, color]) => ({ value, color })),
  };
}

function base({
  type,
  title,
  description,
  w,
  h,
  targets,
  unit,
  extraField = {},
  options = {},
  overrides = [],
}) {
  panelId += 1;
  refCounter = 0;

  return {
    id: panelId,
    type,
    title,
    description,
    datasource: DS,
    gridPos: { w, h, x: 0, y: 0 },
    targets: targets.map((t, i) => ({
      ...t,
      refId: String.fromCharCode(65 + (i % 26)),
    })),
    fieldConfig: {
      defaults: { unit, ...extraField },
      overrides,
    },
    options,
  };
}

const stat = ({
  title,
  description,
  expr,
  unit = 'short',
  steps,
  w = 4,
  h = 4,
  decimals,
  mappings,
  colorMode = 'value',
  zero = false,
}) =>
  base({
    type: 'stat',
    title,
    description,
    w,
    h,
    unit,
    // Contadores sem nenhum evento não têm série: `or vector(0)` mostra 0 em vez de "No data".
    targets: [
      target(zero ? `(${expr}) or vector(0)` : expr, '', { instant: true }),
    ],
    extraField: {
      decimals,
      mappings,
      thresholds: thresholds(steps ?? [[null, 'green']]),
    },
    options: {
      reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
      colorMode,
      graphMode: 'none',
      textMode: 'auto',
      justifyMode: 'center',
    },
  });

const series = ({
  title,
  description,
  targets,
  unit = 'short',
  w = 12,
  h = 8,
  stacked = false,
  min,
  max,
}) =>
  base({
    type: 'timeseries',
    title,
    description,
    w,
    h,
    unit,
    targets: targets.map(([expr, legend]) => target(expr, legend)),
    extraField: {
      min,
      max,
      custom: {
        drawStyle: stacked ? 'bars' : 'line',
        lineWidth: 1,
        fillOpacity: stacked ? 60 : 12,
        showPoints: 'never',
        spanNulls: true,
        stacking: { mode: stacked ? 'normal' : 'none', group: 'A' },
      },
    },
    options: {
      legend: { displayMode: 'list', placement: 'bottom', showLegend: true },
      tooltip: { mode: 'multi', sort: 'desc' },
    },
  });

const bars = ({
  title,
  description,
  expr,
  legend,
  unit = 'short',
  w = 8,
  h = 8,
}) =>
  base({
    type: 'bargauge',
    title,
    description,
    w,
    h,
    unit,
    targets: [target(expr, legend, { instant: true })],
    extraField: { thresholds: thresholds([[null, 'blue']]) },
    options: {
      reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
      orientation: 'horizontal',
      displayMode: 'gradient',
      showUnfilled: true,
      minVizHeight: 12,
    },
  });

const pie = ({ title, description, expr, legend, w = 6, h = 8 }) =>
  base({
    type: 'piechart',
    title,
    description,
    w,
    h,
    unit: 'short',
    targets: [target(expr, legend, { instant: true })],
    options: {
      reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
      pieType: 'donut',
      legend: { displayMode: 'table', placement: 'right', values: ['value'] },
      tooltip: { mode: 'single' },
    },
  });

const table = ({ title, description, expr, w = 12, h = 8, organize }) =>
  base({
    type: 'table',
    title,
    description,
    w,
    h,
    unit: 'short',
    targets: [target(expr, '', { instant: true, format: 'table' })],
    options: { showHeader: true, cellHeight: 'sm' },
    overrides: [],
    extraField: {},
  });

const RANGE = '$__range';
const RATE = '$__rate_interval';

function rowPanel(title, panels) {
  panelId += 1;

  return {
    header: { id: panelId, type: 'row', title, collapsed: false, panels: [] },
    panels,
  };
}

/** Distribui os painéis numa grade de 24 colunas, linha a linha. */
function layout(rows) {
  const out = [];
  let y = 0;

  for (const { header, panels } of rows) {
    header.gridPos = { h: 1, w: 24, x: 0, y };
    out.push(header);
    y += 1;

    let x = 0;
    let rowHeight = 0;

    for (const panel of panels) {
      if (x + panel.gridPos.w > 24) {
        x = 0;
        y += rowHeight;
        rowHeight = 0;
      }

      panel.gridPos.x = x;
      panel.gridPos.y = y;
      x += panel.gridPos.w;
      rowHeight = Math.max(rowHeight, panel.gridPos.h);
      out.push(panel);
    }

    y += rowHeight;
  }

  return out;
}

export function buildDashboard() {
  panelId = 0;

  const overview = rowPanel('Visão geral', [
    stat({
      title: 'API no ar',
      description: 'O Prometheus consegue raspar a API.',
      expr: `min(up{${API}})`,
      steps: [
        [null, 'red'],
        [1, 'green'],
      ],
      mappings: [
        {
          type: 'value',
          options: { 0: { text: 'FORA' }, 1: { text: 'NO AR' } },
        },
      ],
      colorMode: 'background',
    }),
    stat({
      title: 'MCP no ar',
      description: 'O Prometheus consegue raspar o serviço MCP.',
      expr: `min(up{${MCP}})`,
      steps: [
        [null, 'red'],
        [1, 'green'],
      ],
      mappings: [
        {
          type: 'value',
          options: { 0: { text: 'FORA' }, 1: { text: 'NO AR' } },
        },
      ],
      colorMode: 'background',
    }),
    stat({
      title: 'Banco',
      description: 'Resultado da sonda `SELECT 1` da API (a cada 15 s).',
      expr: `min(trampo_db_up{${API}})`,
      steps: [
        [null, 'red'],
        [1, 'green'],
      ],
      mappings: [
        { type: 'value', options: { 0: { text: 'FORA' }, 1: { text: 'OK' } } },
      ],
      colorMode: 'background',
    }),
    stat({
      title: 'Requisições/s',
      description: 'Todas as rotas da API.',
      expr: `sum(rate(trampo_http_requests_total{${API}}[${RATE}]))`,
      unit: 'reqps',
      decimals: 2,
    }),
    stat({
      title: 'Erros 5xx (%)',
      zero: true,
      description: 'Parcela das respostas 5xx no período.',
      expr: `100 * sum(increase(trampo_http_requests_total{${API},status=~"5.."}[${RANGE}])) / clamp_min(sum(increase(trampo_http_requests_total{${API}}[${RANGE}])), 1)`,
      unit: 'percent',
      decimals: 2,
      steps: [
        [null, 'green'],
        [1, 'yellow'],
        [5, 'red'],
      ],
    }),
    stat({
      title: 'Versão',
      description: 'Versão da API em execução (`trampo_build_info`).',
      expr: `count by (version) (trampo_build_info{${API}})`,
      unit: 'none',
      colorMode: 'none',
      mappings: [],
    }),
  ]);

  const http = rowPanel('Requisições HTTP (middleware)', [
    series({
      title: 'Requisições por rota',
      description: 'Top 10 rotas (template, nunca o caminho real).',
      targets: [
        [
          `topk(10, sum by (route) (rate(trampo_http_requests_total{${API}}[${RATE}])))`,
          '{{route}}',
        ],
      ],
      unit: 'reqps',
    }),
    series({
      title: 'Uso pela interface x por agentes',
      description:
        '`jwt` = interface; `pat` = token de integração; `oauth` = conector (Claude).',
      targets: [
        [
          `sum by (auth) (rate(trampo_http_requests_total{${API}}[${RATE}]))`,
          '{{auth}}',
        ],
      ],
      unit: 'reqps',
      stacked: true,
    }),
    series({
      title: 'Latência (p50 / p95 / p99)',
      description: 'Todas as rotas.',
      targets: [
        [
          `histogram_quantile(0.5, sum by (le) (rate(trampo_http_request_duration_seconds_bucket{${API}}[${RATE}])))`,
          'p50',
        ],
        [
          `histogram_quantile(0.95, sum by (le) (rate(trampo_http_request_duration_seconds_bucket{${API}}[${RATE}])))`,
          'p95',
        ],
        [
          `histogram_quantile(0.99, sum by (le) (rate(trampo_http_request_duration_seconds_bucket{${API}}[${RATE}])))`,
          'p99',
        ],
      ],
      unit: 's',
    }),
    series({
      title: 'Latência p95 por rota',
      targets: [
        [
          `topk(8, histogram_quantile(0.95, sum by (le, route) (rate(trampo_http_request_duration_seconds_bucket{${API}}[${RATE}]))))`,
          '{{route}}',
        ],
      ],
      unit: 's',
    }),
    series({
      title: 'Respostas por classe de status',
      targets: [
        [
          `sum by (status_class) (rate(trampo_http_request_duration_seconds_count{${API}}[${RATE}]))`,
          '{{status_class}}',
        ],
      ],
      unit: 'reqps',
      stacked: true,
    }),
    series({
      title: 'Requisições em andamento',
      targets: [
        [`sum(trampo_http_requests_in_flight{${API}})`, 'em andamento'],
      ],
    }),
  ]);

  const product = rowPanel('Produto e uso', [
    stat({
      title: 'Usuários',
      expr: `sum(trampo_users{${API}})`,
      description: 'Total de contas.',
    }),
    stat({
      title: 'Verificados',
      expr: `sum(trampo_users{${API},state="verified"})`,
      description: 'Contas com e-mail verificado.',
    }),
    stat({
      title: 'Ativos (1 dia)',
      expr: `max(trampo_users_active{${API},window="1d"})`,
      description:
        'Usuários com candidatura criada ou alterada nas últimas 24 h.',
    }),
    stat({
      title: 'Ativos (7 dias)',
      expr: `max(trampo_users_active{${API},window="7d"})`,
      description: 'Idem, 7 dias.',
    }),
    stat({
      title: 'Ativos (30 dias)',
      expr: `max(trampo_users_active{${API},window="30d"})`,
      description: 'Idem, 30 dias.',
    }),
    stat({
      title: 'Candidaturas',
      expr: `sum(trampo_applications{${API}})`,
      description: 'Não excluídas.',
    }),
    bars({
      title: 'Funil de ativação',
      description:
        'Usuários em cada etapa (estado atual): cadastro, e-mail verificado, primeira candidatura, já em andamento, já finalizada.',
      expr: `max by (stage) (trampo_users_funnel{${API}})`,
      legend: '{{stage}}',
      w: 8,
    }),
    pie({
      title: 'Candidaturas por status',
      expr: `sum by (status) (trampo_applications{${API}})`,
      legend: '{{status}}',
      w: 8,
    }),
    bars({
      title: 'Usuários por profundidade de uso',
      description: 'Usuários com pelo menos N candidaturas.',
      expr: `max by (at_least) (trampo_users_with_applications{${API}})`,
      legend: '≥ {{at_least}}',
      w: 8,
    }),
    series({
      title: 'Candidaturas criadas por canal',
      description:
        '`web` = interface; `agent_token` = token de integração; `agent_oauth` = conector.',
      targets: [
        [
          `sum by (channel) (increase(trampo_applications_created_total{${API}}[$__interval]))`,
          '{{channel}}',
        ],
      ],
      stacked: true,
    }),
    bars({
      title: 'De onde vêm as vagas',
      description: 'Categoria do site da vaga (lista fechada) no período.',
      expr: `topk(10, sum by (source) (increase(trampo_applications_created_total{${API}}[${RANGE}])))`,
      legend: '{{source}}',
      w: 6,
    }),
    table({
      title: 'Transições de status no período',
      description:
        'Funil de conversão: de qual status para qual, e por qual canal.',
      expr: `sum by (from, to, channel) (increase(trampo_applications_transitions_total{${API}}[${RANGE}])) > 0`,
      w: 6,
    }),
    series({
      title: 'Usuários ativos',
      targets: [
        [`max by (window) (trampo_users_active{${API}})`, '{{window}}'],
      ],
    }),
    series({
      title: 'Pipeline parado (abertas sem alteração)',
      description:
        'Candidaturas Aguardando/Em andamento sem alteração há N dias.',
      targets: [
        [
          `max by (days) (trampo_applications_stale{${API}})`,
          '> {{days}} dias',
        ],
      ],
    }),
    series({
      title: 'Atualizações de fase, reordenações e exclusões',
      targets: [
        [
          `sum(increase(trampo_applications_phase_updates_total{${API}}[$__interval]))`,
          'fases atualizadas',
        ],
        [
          `sum(increase(trampo_applications_reordered_total{${API}}[$__interval]))`,
          'reordenações',
        ],
        [
          `sum by (mode) (increase(trampo_applications_deleted_total{${API}}[$__interval]))`,
          'exclusões ({{mode}})',
        ],
      ],
      stacked: true,
    }),
    series({
      title: 'Cadastros e verificação de e-mail',
      targets: [
        [
          `sum by (source, result) (increase(trampo_auth_registrations_total{${API}}[$__interval]))`,
          'cadastro {{source}} ({{result}})',
        ],
        [
          `sum by (result) (increase(trampo_auth_email_verifications_total{${API}}[$__interval]))`,
          'verificação ({{result}})',
        ],
      ],
      stacked: true,
    }),
  ]);

  const security = rowPanel('Segurança', [
    stat({
      title: 'Sessões reutilizadas',
      zero: true,
      description: 'Refresh de sessão reutilizado: sinal de roubo. Deve ser 0.',
      expr: `sum(increase(trampo_auth_session_refreshes_total{${API},result="reused"}[${RANGE}]))`,
      steps: [
        [null, 'green'],
        [1, 'red'],
      ],
      colorMode: 'background',
    }),
    stat({
      title: 'Códigos OAuth reutilizados',
      zero: true,
      description:
        'Código de autorização reutilizado: sinal de roubo. Deve ser 0.',
      expr: `sum(increase(trampo_oauth_code_reuse_total{${API}}[${RANGE}]))`,
      steps: [
        [null, 'green'],
        [1, 'red'],
      ],
      colorMode: 'background',
    }),
    stat({
      title: 'Refresh OAuth reutilizado',
      zero: true,
      description:
        'Refresh reutilizado fora da janela de graça (família revogada). Deve ser 0.',
      expr: `sum(increase(trampo_oauth_refresh_reuse_total{${API}}[${RANGE}]))`,
      steps: [
        [null, 'green'],
        [1, 'red'],
      ],
      colorMode: 'background',
    }),
    stat({
      title: 'Login travado',
      zero: true,
      description: 'Vezes em que o limitador global de login travou.',
      expr: `sum(increase(trampo_auth_login_lockouts_total{${API}}[${RANGE}]))`,
      steps: [
        [null, 'green'],
        [1, 'yellow'],
      ],
    }),
    stat({
      title: 'Buscas CIMD bloqueadas',
      zero: true,
      description:
        'Tentativas de SSRF barradas na busca do documento do cliente OAuth.',
      expr: `sum(increase(trampo_oauth_cimd_fetch_total{${API},result="blocked"}[${RANGE}]))`,
      steps: [
        [null, 'green'],
        [1, 'yellow'],
      ],
    }),
    stat({
      title: 'Redirects fora da allowlist',
      zero: true,
      description:
        'Registros de cliente OAuth recusados por `redirect_uri` não permitido.',
      expr: `sum(increase(trampo_oauth_client_registrations_total{${API},result="invalid_redirect_uri"}[${RANGE}]))`,
      steps: [
        [null, 'green'],
        [1, 'yellow'],
      ],
    }),
    series({
      title: 'Tentativas de login',
      targets: [
        [
          `sum by (method, result) (rate(trampo_auth_login_attempts_total{${API}}[${RATE}]))`,
          '{{method}} {{result}}',
        ],
      ],
      unit: 'reqps',
      stacked: true,
    }),
    series({
      title: 'Negações do guard',
      description: 'Por motivo e tipo de autenticação.',
      targets: [
        [
          `sum by (reason, auth) (increase(trampo_auth_guard_denials_total{${API}}[$__interval]))`,
          '{{reason}} ({{auth}})',
        ],
      ],
      stacked: true,
    }),
    series({
      title: 'Limitadores de taxa que barraram',
      targets: [
        [
          `sum by (rule) (increase(trampo_rate_limit_hits_total{${API}}[$__interval]))`,
          '{{rule}}',
        ],
      ],
      stacked: true,
    }),
    series({
      title: 'Renovação de sessão',
      targets: [
        [
          `sum by (result) (increase(trampo_auth_session_refreshes_total{${API}}[$__interval]))`,
          '{{result}}',
        ],
      ],
      stacked: true,
    }),
    series({
      title: 'Tokens de integração',
      targets: [
        [
          `sum by (event, scope) (increase(trampo_pat_events_total{${API}}[$__interval]))`,
          '{{event}} ({{scope}})',
        ],
      ],
      stacked: true,
    }),
    series({
      title: 'Tokens de integração ativos',
      targets: [[`sum by (scope) (trampo_pat_active{${API}})`, '{{scope}}']],
    }),
  ]);

  const oauthMcp = rowPanel('OAuth e MCP', [
    stat({
      title: 'Aplicativos conectados',
      description: 'Grants OAuth ativos.',
      expr: `max(trampo_oauth_grants_active{${API}})`,
    }),
    stat({
      title: 'Aprovados / total',
      zero: true,
      description: 'Autorizações aprovadas no período.',
      expr: `sum(increase(trampo_oauth_authorizations_total{${API},decision="approved"}[${RANGE}]))`,
    }),
    stat({
      title: 'Erros do /token (%)',
      zero: true,
      description:
        'Parcela das requisições ao `/oauth/token` que não deram certo.',
      expr: `100 * sum(increase(trampo_oauth_token_requests_total{${API},result!="ok"}[${RANGE}])) / clamp_min(sum(increase(trampo_oauth_token_requests_total{${API}}[${RANGE}])), 1)`,
      unit: 'percent',
      decimals: 1,
      steps: [
        [null, 'green'],
        [20, 'yellow'],
        [50, 'red'],
      ],
    }),
    stat({
      title: 'Erros das ferramentas MCP (%)',
      zero: true,
      expr: `100 * sum(increase(trampo_mcp_tool_calls_total{${MCP},result="error"}[${RANGE}])) / clamp_min(sum(increase(trampo_mcp_tool_calls_total{${MCP}}[${RANGE}])), 1)`,
      unit: 'percent',
      decimals: 1,
      steps: [
        [null, 'green'],
        [10, 'yellow'],
        [20, 'red'],
      ],
    }),
    stat({
      title: 'Chamadas de ferramenta',
      zero: true,
      expr: `sum(increase(trampo_mcp_tool_calls_total{${MCP}}[${RANGE}]))`,
    }),
    stat({
      title: 'Conexões novas (401 sem token)',
      zero: true,
      description: 'O `401` sem credencial é o que inicia o login OAuth.',
      expr: `sum(increase(trampo_mcp_auth_challenges_total{${MCP},reason="missing"}[${RANGE}]))`,
    }),
    series({
      title: 'Funil de conexão do conector',
      description: 'Decisões na tela de permissão.',
      targets: [
        [
          `sum by (decision, client_kind) (increase(trampo_oauth_authorizations_total{${API}}[$__interval]))`,
          '{{decision}} ({{client_kind}})',
        ],
      ],
      stacked: true,
    }),
    series({
      title: 'Requisições ao /oauth/token',
      targets: [
        [
          `sum by (grant_type, result) (increase(trampo_oauth_token_requests_total{${API}}[$__interval]))`,
          '{{grant_type}} {{result}}',
        ],
      ],
      stacked: true,
    }),
    pie({
      title: 'Credencial no MCP: token x OAuth',
      description: '`tfp` = token de integração; `tfo` = OAuth.',
      expr: `sum by (kind) (increase(trampo_mcp_token_kind_total{${MCP}}[${RANGE}]))`,
      legend: '{{kind}}',
    }),
    pie({
      title: 'Agentes que usam o MCP',
      description: 'Classificado em categorias fechadas.',
      expr: `sum by (client) (increase(trampo_mcp_client_requests_total{${MCP}}[${RANGE}]))`,
      legend: '{{client}}',
    }),
    bars({
      title: 'Ferramentas mais usadas',
      expr: `sum by (tool) (increase(trampo_mcp_tool_calls_total{${MCP}}[${RANGE}]))`,
      legend: '{{tool}}',
      w: 12,
    }),
    series({
      title: 'Ferramentas: resultado',
      targets: [
        [
          `sum by (tool, result) (increase(trampo_mcp_tool_calls_total{${MCP}}[$__interval]))`,
          '{{tool}} {{result}}',
        ],
      ],
      stacked: true,
    }),
    series({
      title: 'Ferramentas: latência p95',
      targets: [
        [
          `histogram_quantile(0.95, sum by (le, tool) (rate(trampo_mcp_tool_duration_seconds_bucket{${MCP}}[${RATE}])))`,
          '{{tool}}',
        ],
      ],
      unit: 's',
    }),
    series({
      title: 'Idas do MCP à API',
      description: 'Rota (template) e status das chamadas.',
      targets: [
        [
          `sum by (endpoint, status) (increase(trampo_mcp_upstream_requests_total{${MCP}}[$__interval]))`,
          '{{endpoint}} {{status}}',
        ],
      ],
      stacked: true,
    }),
    series({
      title: 'Validação de token no MCP',
      description: '`cache_hit` evita uma ida à API (cache de 60 s).',
      targets: [
        [
          `sum by (result) (increase(trampo_mcp_token_validation_total{${MCP}}[$__interval]))`,
          '{{result}}',
        ],
      ],
      stacked: true,
    }),
    series({
      title: 'Buscas CIMD e cache',
      targets: [
        [
          `sum by (result) (increase(trampo_oauth_cimd_fetch_total{${API}}[$__interval]))`,
          'busca {{result}}',
        ],
        [
          `sum by (result) (increase(trampo_oauth_cimd_cache_total{${API}}[$__interval]))`,
          'cache {{result}}',
        ],
      ],
      stacked: true,
    }),
    series({
      title: 'Limpeza horária do OAuth',
      targets: [
        [
          `sum by (table) (increase(trampo_oauth_cleanup_deleted_total{${API}}[$__interval]))`,
          'apagou {{table}}',
        ],
        [
          `sum(increase(trampo_oauth_cleanup_failures_total{${API}}[$__interval]))`,
          'falhas',
        ],
      ],
    }),
  ]);

  const preview = rowPanel('Preenchimento pelo link', [
    stat({
      title: 'Lidos com sucesso (%)',
      description: 'Pré-visualizações que encontraram dados da vaga.',
      expr: `100 * sum(increase(trampo_job_preview_total{${API},status="found"}[${RANGE}])) / clamp_min(sum(increase(trampo_job_preview_total{${API}}[${RANGE}])), 1)`,
      unit: 'percent',
      decimals: 0,
      steps: [
        [null, 'red'],
        [40, 'yellow'],
        [70, 'green'],
      ],
      w: 6,
    }),
    series({
      title: 'Resultado do preenchimento',
      targets: [
        [
          `sum by (status) (increase(trampo_job_preview_total{${API}}[$__interval]))`,
          '{{status}}',
        ],
      ],
      stacked: true,
    }),
    table({
      title: 'Sites: leitura por fonte',
      description: 'Tentativas por fonte da vaga e resultado, no período.',
      expr: `sum by (source, status) (increase(trampo_job_preview_total{${API}}[${RANGE}])) > 0`,
      w: 6,
    }),
    series({
      title: 'Duração da extração (p95)',
      targets: [
        [
          `histogram_quantile(0.95, sum by (le, status) (rate(trampo_job_preview_duration_seconds_bucket{${API}}[${RATE}])))`,
          '{{status}}',
        ],
      ],
      unit: 's',
    }),
  ]);

  const mail = rowPanel('E-mail', [
    series({
      title: 'E-mails por modelo e resultado',
      description:
        '`error` é falha de envio: sem o e-mail de verificação ninguém ativa a conta.',
      targets: [
        [
          `sum by (template, result) (increase(trampo_mail_sent_total{${API}}[$__interval]))`,
          '{{template}} {{result}}',
        ],
      ],
      stacked: true,
    }),
    series({
      title: 'Duração do envio (p95)',
      targets: [
        [
          `histogram_quantile(0.95, sum by (le, template) (rate(trampo_mail_duration_seconds_bucket{${API}}[${RATE}])))`,
          '{{template}}',
        ],
      ],
      unit: 's',
    }),
  ]);

  const runtime = rowPanel('Banco e processos', [
    series({
      title: 'Consultas ao banco (p95 por tabela)',
      targets: [
        [
          `topk(8, histogram_quantile(0.95, sum by (le, table) (rate(trampo_db_query_duration_seconds_bucket{${API}}[${RATE}]))))`,
          '{{table}}',
        ],
      ],
      unit: 's',
    }),
    series({
      title: 'Consultas por operação',
      targets: [
        [
          `sum by (operation) (rate(trampo_db_query_duration_seconds_count{${API}}[${RATE}]))`,
          '{{operation}}',
        ],
      ],
      unit: 'ops',
      stacked: true,
    }),
    series({
      title: 'Atraso do event loop (p99)',
      description: 'API e MCP. Acima de 200 ms o processo está saturado.',
      targets: [
        [
          `max by (job) (nodejs_eventloop_lag_p99_seconds{job=~"trampo-flow-(api|mcp)"})`,
          '{{job}}',
        ],
      ],
      unit: 's',
    }),
    series({
      title: 'Memória (RSS)',
      targets: [
        [
          `max by (job) (process_resident_memory_bytes{job=~"trampo-flow-(api|mcp)"})`,
          '{{job}}',
        ],
      ],
      unit: 'bytes',
    }),
    series({
      title: 'Heap usado',
      targets: [
        [
          `max by (job) (nodejs_heap_size_used_bytes{job=~"trampo-flow-(api|mcp)"})`,
          '{{job}}',
        ],
      ],
      unit: 'bytes',
    }),
    series({
      title: 'CPU do processo',
      targets: [
        [
          `sum by (job) (rate(process_cpu_seconds_total{job=~"trampo-flow-(api|mcp)"}[${RATE}]))`,
          '{{job}}',
        ],
      ],
      unit: 'percentunit',
    }),
    series({
      title: 'Descritores de arquivo abertos',
      targets: [
        [
          `max by (job) (process_open_fds{job=~"trampo-flow-(api|mcp)"})`,
          '{{job}}',
        ],
      ],
    }),
    series({
      title: 'Estoques de negócio: última atualização',
      description:
        'Segundos desde a última atualização dos estoques calculados no banco (deve ficar abaixo de ~90).',
      targets: [
        [
          `time() - max(trampo_business_gauges_last_refresh_timestamp_seconds{${API}})`,
          'atraso',
        ],
      ],
      unit: 's',
    }),
  ]);

  const panels = layout([
    overview,
    http,
    product,
    security,
    oauthMcp,
    preview,
    mail,
    runtime,
  ]);

  return {
    uid: 'trampo-flow-overview',
    title: 'Trampo Flow',
    description:
      'Uso, segurança, OAuth/MCP e saúde do Trampo Flow, a partir do /metrics da API e do MCP.',
    tags: ['trampo-flow'],
    timezone: 'browser',
    editable: true,
    graphTooltip: 1,
    schemaVersion: 39,
    version: 1,
    refresh: '1m',
    time: { from: 'now-24h', to: 'now' },
    templating: {
      list: [
        {
          name: 'datasource',
          label: 'Prometheus',
          type: 'datasource',
          query: 'prometheus',
          current: {},
          hide: 0,
          refresh: 1,
        },
      ],
    },
    annotations: { list: [] },
    links: [],
    panels,
  };
}
