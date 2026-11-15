import { afterEach, describe, expect, it } from 'vitest';
import { connect, makeApplication, page } from './helpers.js';

const ID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

let close: (() => Promise<void>) | undefined;

afterEach(async () => {
  await close?.();
  close = undefined;
});

async function setup(routes: Parameters<typeof connect>[0]) {
  const connection = await connect(routes);
  close = connection.close;
  return connection;
}

describe('servidor MCP', () => {
  it('lista as 7 tools com anotações e sem tool de exclusão', async () => {
    const { mcp } = await setup({});
    const { tools } = await mcp.listTools();
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

    expect(Object.keys(byName).sort()).toEqual([
      'create_application',
      'get_application',
      'list_applications',
      'move_application',
      'pipeline_summary',
      'preview_job_posting',
      'update_application',
    ]);
    expect(tools.some((tool) => /delete|remove/i.test(tool.name))).toBe(false);

    for (const name of [
      'list_applications',
      'get_application',
      'pipeline_summary',
      'preview_job_posting',
    ]) {
      expect(byName[name]?.annotations?.readOnlyHint).toBe(true);
    }
    for (const name of [
      'create_application',
      'update_application',
      'move_application',
    ]) {
      expect(byName[name]?.annotations?.readOnlyHint).toBe(false);
      expect(byName[name]?.annotations?.destructiveHint).toBe(false);
    }
  });

  it('expõe o prompt revisar_funil', async () => {
    const { mcp } = await setup({});
    const { prompts } = await mcp.listPrompts();
    const prompt = await mcp.getPrompt({
      name: 'revisar_funil',
      arguments: { staleDays: '14' },
    });

    expect(prompts.map((p) => p.name)).toEqual(['revisar_funil']);
    expect(JSON.stringify(prompt.messages)).toContain('staleDays=14');
  });
});

describe('preview_job_posting', () => {
  it('chama POST /applications/preview', async () => {
    const { call, calls } = await setup({
      'POST /applications/preview': {
        body: {
          title: 'Dev',
          company: 'ACME',
          companyUrl: null,
          status: 'found',
        },
      },
    });

    const { json } = await call('preview_job_posting', {
      link: 'https://jobs.example.com/1',
    });

    expect(calls[0]?.body).toEqual({ link: 'https://jobs.example.com/1' });
    expect(json).toMatchObject({
      title: 'Dev',
      company: 'ACME',
      status: 'found',
    });
  });
});

describe('list_applications', () => {
  it('devolve resposta enxuta com rótulo e dias parada', async () => {
    const { call, calls } = await setup({
      'GET /applications': page(
        [makeApplication({ daysAgo: 3, status: 'IN_PROGRESS' })],
        true,
      ),
    });

    const { json } = await call('list_applications', {
      status: 'IN_PROGRESS',
      search: 'hay',
    });

    expect(calls[0]?.query).toEqual({
      status: 'IN_PROGRESS',
      search: 'hay',
      limit: '25',
    });
    expect(json.hasMore).toBe(true);
    expect(json.items[0]).toEqual({
      id: ID,
      title: 'Pessoa Desenvolvedora Backend',
      company: 'Haytek',
      status: 'IN_PROGRESS',
      statusLabel: 'Em andamento',
      currentPhase: 'Candidatura enviada',
      daysSinceUpdate: 3,
    });
  });

  it('valida o status pelo schema', async () => {
    const { call, calls } = await setup({});

    const { result } = await call('list_applications', { status: 'DONE' });

    expect(result.isError).toBe(true);
    expect(calls).toHaveLength(0);
  });
});

describe('get_application', () => {
  it('chama GET /applications/:id e traduz 404', async () => {
    const { call } = await setup({
      [`GET /applications/${ID}`]: { body: makeApplication() },
      [`GET /applications/${OTHER}`]: {
        status: 404,
        body: { message: 'Candidatura não encontrada.' },
      },
    });

    expect((await call('get_application', { id: ID })).json).toMatchObject({
      id: ID,
      link: 'https://jobs.example.com/vaga/123',
    });

    const missing = await call('get_application', { id: OTHER });
    expect(missing.result.isError).toBe(true);
    expect(missing.text).toMatch(/^Candidatura não encontrada/);
  });
});

describe('create_application', () => {
  const link = 'https://jobs.example.com/vaga/999';

  it('preenche com o preview e usa a fase padrão', async () => {
    const { call, calls } = await setup({
      'POST /applications/preview': {
        body: {
          title: 'Dev Node',
          company: 'ACME',
          companyUrl: 'https://acme.dev',
          status: 'found',
        },
      },
      'GET /applications': page([]),
      'POST /applications': ({ body }) => ({
        status: 201,
        body: makeApplication({ ...(body as object), link }),
      }),
    });

    const { json, result } = await call('create_application', { link });

    expect(result.isError).toBeFalsy();
    const created = calls.find(
      (c) => c.method === 'POST' && c.path === '/applications',
    );
    expect(created?.body).toEqual({
      title: 'Dev Node',
      company: 'ACME',
      companyUrl: 'https://acme.dev',
      link,
      currentPhase: 'Candidatura enviada',
    });
    expect(json).toMatchObject({
      alreadyExisted: false,
      filledFromPage: { title: true, company: true, companyUrl: true },
    });
  });

  it('não chama o preview quando tudo foi informado', async () => {
    const { call, calls } = await setup({
      'GET /applications': page([]),
      'POST /applications': { status: 201, body: makeApplication() },
    });

    await call('create_application', {
      link,
      title: 'Dev',
      company: 'ACME',
      companyUrl: 'https://acme.dev',
      currentPhase: 'Teste técnico',
      status: 'IN_PROGRESS',
    });

    expect(calls.some((c) => c.path === '/applications/preview')).toBe(false);
    expect(calls.at(-1)?.body).toMatchObject({
      currentPhase: 'Teste técnico',
      status: 'IN_PROGRESS',
    });
  });

  it('não inventa título nem empresa quando a página não informa', async () => {
    const { call, calls } = await setup({
      'POST /applications/preview': {
        body: {
          title: null,
          company: null,
          companyUrl: null,
          status: 'blocked',
        },
      },
    });

    const { result, text } = await call('create_application', { link });

    expect(result.isError).toBe(true);
    expect(text).toMatch(/title e company/);
    expect(text).toMatch(/blocked/);
    expect(
      calls.some((c) => c.method === 'POST' && c.path === '/applications'),
    ).toBe(false);
  });

  it('pede só o campo que faltou', async () => {
    const { call } = await setup({
      'POST /applications/preview': {
        body: {
          title: 'Dev',
          company: null,
          companyUrl: null,
          status: 'no_data',
        },
      },
    });

    const { text } = await call('create_application', { link });

    expect(text).toMatch(/Não consegui ler company/);
  });

  it('devolve a existente quando o link já está cadastrado', async () => {
    const existing = makeApplication({
      link: 'https://www.jobs.example.com/vaga/999/',
    });
    const { call, calls } = await setup({
      'POST /applications/preview': {
        body: {
          title: 'Dev',
          company: 'Haytek',
          companyUrl: null,
          status: 'found',
        },
      },
      'GET /applications': page([existing]),
    });

    const { json } = await call('create_application', { link });

    expect(json.alreadyExisted).toBe(true);
    expect(json.application.id).toBe(existing.id);
    expect(
      calls.some((c) => c.method === 'POST' && c.path === '/applications'),
    ).toBe(false);
  });

  it('repassa a mensagem de validação da API', async () => {
    const { call } = await setup({
      'GET /applications': page([]),
      'POST /applications': {
        status: 400,
        body: { message: ['link must be a URL address'] },
      },
    });

    const { result, text } = await call('create_application', {
      link,
      title: 'a',
      company: 'b',
      companyUrl: 'https://b.dev',
    });

    expect(result.isError).toBe(true);
    expect(text).toMatch(/link must be a URL address/);
  });
});

describe('update_application', () => {
  it('envia só os campos informados', async () => {
    const { call, calls } = await setup({
      [`PATCH /applications/${ID}`]: ({ body }) => ({
        body: makeApplication(body as object),
      }),
    });

    const { json } = await call('update_application', {
      id: ID,
      currentPhase: 'Entrevista técnica',
    });

    expect(calls[0]?.body).toEqual({ currentPhase: 'Entrevista técnica' });
    expect(json.currentPhase).toBe('Entrevista técnica');
  });

  it('exige pelo menos um campo', async () => {
    const { call, calls } = await setup({});

    const { result, text } = await call('update_application', { id: ID });

    expect(result.isError).toBe(true);
    expect(text).toMatch(/pelo menos um campo/);
    expect(calls).toHaveLength(0);
  });
});

describe('move_application', () => {
  const board = (topOfInProgress?: string) => ({
    body: {
      columns: [
        {
          status: 'PENDING',
          total: 1,
          hasMore: false,
          items: [makeApplication()],
        },
        {
          status: 'IN_PROGRESS',
          total: topOfInProgress ? 1 : 0,
          hasMore: false,
          items: topOfInProgress
            ? [makeApplication({ id: topOfInProgress, status: 'IN_PROGRESS' })]
            : [],
        },
        { status: 'COMPLETED', total: 0, hasMore: false, items: [] },
        { status: 'REJECTED', total: 0, hasMore: false, items: [] },
      ],
    },
  });

  it('coloca no topo da coluna usando afterId', async () => {
    const { call, calls } = await setup({
      'GET /applications/board': board(OTHER),
      [`PATCH /applications/${ID}/placement`]: {
        body: makeApplication({ status: 'IN_PROGRESS' }),
      },
    });

    const { json } = await call('move_application', {
      id: ID,
      status: 'IN_PROGRESS',
    });

    expect(calls[0]?.query).toEqual({ limitPerColumn: '1' });
    expect(calls[1]?.body).toEqual({ status: 'IN_PROGRESS', afterId: OTHER });
    expect(json.moved).toBe(true);
  });

  it('em coluna vazia envia só o status', async () => {
    const { call, calls } = await setup({
      'GET /applications/board': board(),
      [`PATCH /applications/${ID}/placement`]: {
        body: makeApplication({ status: 'IN_PROGRESS' }),
      },
    });

    await call('move_application', { id: ID, status: 'IN_PROGRESS' });

    expect(calls[1]?.body).toEqual({ status: 'IN_PROGRESS' });
  });

  it('não mexe se já está no topo', async () => {
    const { call, calls } = await setup({
      'GET /applications/board': board(ID),
    });

    const { json } = await call('move_application', {
      id: ID,
      status: 'IN_PROGRESS',
    });

    expect(json.moved).toBe(false);
    expect(calls).toHaveLength(1);
  });
});

describe('pipeline_summary', () => {
  it('soma por status e lista só as abertas paradas, das mais antigas', async () => {
    const { call, calls } = await setup({
      'GET /applications/stats': {
        body: {
          total: 5,
          byStatus: { PENDING: 2, IN_PROGRESS: 2, COMPLETED: 1, REJECTED: 0 },
        },
      },
      'GET /applications': ({ query }) =>
        query.status === 'PENDING'
          ? page([
              makeApplication({ id: 'a', daysAgo: 20 }),
              makeApplication({ id: 'b', daysAgo: 2 }),
            ])
          : page([
              makeApplication({ id: 'c', status: 'IN_PROGRESS', daysAgo: 9 }),
            ]),
    });

    const { json } = await call('pipeline_summary', {});

    expect(
      calls.filter((c) => c.path === '/applications').map((c) => c.query),
    ).toEqual([
      { status: 'PENDING', sort: 'stale', limit: '100' },
      { status: 'IN_PROGRESS', sort: 'stale', limit: '100' },
    ]);
    expect(json.byStatus.IN_PROGRESS).toEqual({
      label: 'Em andamento',
      count: 2,
    });
    expect(json.staleDays).toBe(7);
    expect(json.stale.map((item: { id: string }) => item.id)).toEqual([
      'a',
      'c',
    ]);
  });

  it('respeita staleDays e traduz 401', async () => {
    const { call } = await setup({
      'GET /applications/stats': {
        status: 401,
        body: { message: 'Token inválido' },
      },
      'GET /applications': page([]),
    });

    const { result, text } = await call('pipeline_summary', { staleDays: 30 });

    expect(result.isError).toBe(true);
    expect(text).toMatch(/Configurações → Tokens de integração/);
  });
});
