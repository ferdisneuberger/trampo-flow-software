import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isPublicAddress } from '../../src/infrastructure/http/job-page/public-address';
import { SafeHttpJobPageFetcher } from '../../src/infrastructure/http/job-page/safe-http-job-page-fetcher';

let server: Server;
let baseUrl: string;
let port: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    switch (request.url) {
      case '/vaga':
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end('<title>Vaga de Programação</title>');
        return;
      case '/latin1':
        response.writeHead(200, {
          'content-type': 'text/html; charset=iso-8859-1',
        });
        response.end(Buffer.from('<title>Programação</title>', 'latin1'));
        return;
      case '/redirect':
        response.writeHead(302, { location: '/vaga' });
        response.end();
        return;
      case '/loop':
        response.writeHead(302, { location: '/loop' });
        response.end();
        return;
      case '/metadata':
        response.writeHead(302, {
          location: 'http://169.254.169.254/latest/meta-data',
        });
        response.end();
        return;
      case '/json':
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('{}');
        return;
      case '/big':
        response.writeHead(200, { 'content-type': 'text/html' });
        response.end(`<title>Grande</title>${'x'.repeat(50_000)}`);
        return;
      case '/slow':
        setTimeout(() => {
          response.writeHead(200, { 'content-type': 'text/html' });
          response.end('<title>Lenta</title>');
        }, 500);
        return;
      default:
        response.writeHead(404);
        response.end();
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = String((server.address() as AddressInfo).port);
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

/** Libera só o servidor local de teste; o resto segue a regra real. */
function localFetcher(options: { timeoutMs?: number; maxBytes?: number } = {}) {
  return new SafeHttpJobPageFetcher({
    ...options,
    allowedPorts: [port],
    isAllowedAddress: (address) =>
      address === '127.0.0.1' || isPublicAddress(address),
  });
}

describe('SafeHttpJobPageFetcher', () => {
  it('busca o HTML da página', async () => {
    await expect(localFetcher().fetch(`${baseUrl}/vaga`)).resolves.toEqual({
      ok: true,
      html: '<title>Vaga de Programação</title>',
      finalUrl: `${baseUrl}/vaga`,
    });
  });

  it('respeita o charset informado pelo servidor', async () => {
    const result = await localFetcher().fetch(`${baseUrl}/latin1`);

    expect(result).toMatchObject({
      ok: true,
      html: '<title>Programação</title>',
    });
  });

  it('segue redirecionamentos e informa a URL final', async () => {
    await expect(
      localFetcher().fetch(`${baseUrl}/redirect`),
    ).resolves.toMatchObject({ ok: true, finalUrl: `${baseUrl}/vaga` });
  });

  it('desiste depois de redirecionamentos demais', async () => {
    await expect(localFetcher().fetch(`${baseUrl}/loop`)).resolves.toEqual({
      ok: false,
      reason: 'unreachable',
    });
  });

  it('bloqueia redirecionamento para endereço interno', async () => {
    await expect(localFetcher().fetch(`${baseUrl}/metadata`)).resolves.toEqual({
      ok: false,
      reason: 'blocked',
    });
  });

  it('recusa conteúdo que não é HTML', async () => {
    await expect(localFetcher().fetch(`${baseUrl}/json`)).resolves.toEqual({
      ok: false,
      reason: 'not_html',
    });
  });

  it('usa só o começo de páginas grandes', async () => {
    const result = await localFetcher({ maxBytes: 1_000 }).fetch(
      `${baseUrl}/big`,
    );

    expect(result.ok).toBe(true);
    expect(result.ok && result.html.length).toBe(1_000);
    expect(result.ok && result.html.startsWith('<title>Grande</title>')).toBe(
      true,
    );
  });

  it('avisa timeout quando a página demora', async () => {
    await expect(
      localFetcher({ timeoutMs: 100 }).fetch(`${baseUrl}/slow`),
    ).resolves.toEqual({ ok: false, reason: 'timeout' });
  });

  it('trata erro HTTP como página inacessível', async () => {
    await expect(
      localFetcher().fetch(`${baseUrl}/nao-existe`),
    ).resolves.toEqual({
      ok: false,
      reason: 'unreachable',
    });
  });

  describe('com as regras de produção', () => {
    const fetcher = new SafeHttpJobPageFetcher({ timeoutMs: 2_000 });

    it.each([
      'http://127.0.0.1/',
      'http://localhost/',
      'http://[::1]/',
      'http://[::ffff:10.0.0.1]/',
      'http://169.254.169.254/latest/meta-data',
      'http://example.com:8080/',
      'http://user:senha@example.com/',
      'ftp://example.com/arquivo',
    ])('bloqueia %s', async (url) => {
      await expect(fetcher.fetch(url)).resolves.toEqual({
        ok: false,
        reason: 'blocked',
      });
    });

    it('bloqueia o servidor local de teste, mesmo na porta liberada', async () => {
      const strict = new SafeHttpJobPageFetcher({ allowedPorts: [port] });

      await expect(strict.fetch(`${baseUrl}/vaga`)).resolves.toEqual({
        ok: false,
        reason: 'blocked',
      });
    });
  });
});
