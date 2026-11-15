import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SafeHttpClientMetadataFetcher } from '../../src/infrastructure/oauth/safe-http-client-metadata-fetcher';

let server: Server;
let port: string;
let internalHits = 0;

beforeAll(async () => {
  server = createServer((request, response) => {
    switch (request.url) {
      case '/ok':
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, max-age=600',
        });
        response.end('{"client_id":"x"}');
        return;
      case '/ld':
        response.writeHead(200, { 'content-type': 'application/ld+json' });
        response.end('{}');
        return;
      case '/redirect':
        response.writeHead(302, { location: '/ok' });
        response.end();
        return;
      case '/interno':
        internalHits += 1;
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('{}');
        return;
      case '/html':
        response.writeHead(200, { 'content-type': 'text/html' });
        response.end('<html></html>');
        return;
      case '/invalido':
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('{nao e json');
        return;
      case '/grande':
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(`{"a":"${'x'.repeat(40_000)}"}`);
        return;
      case '/lento':
        setTimeout(() => {
          response.writeHead(200, { 'content-type': 'application/json' });
          response.end('{}');
        }, 800);
        return;
      default:
        response.writeHead(404);
        response.end();
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = String((server.address() as AddressInfo).port);
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

/** Libera loopback e http só para exercitar a lógica contra o servidor local. */
function permissive() {
  return new SafeHttpClientMetadataFetcher({
    isAllowedAddress: () => true,
    allowedPorts: [port],
    allowedProtocols: ['http:', 'https:'],
    timeoutMs: 300,
    maxBytes: 16 * 1024,
  });
}

const local = (path: string) => `http://127.0.0.1:${port}${path}`;

describe('CIMD: busca do documento (anti-SSRF e limites)', () => {
  describe('configuração de produção (sem liberações)', () => {
    const fetcher = new SafeHttpClientMetadataFetcher();

    it.each([
      ['http (sem TLS)', 'http://example.com/client.json'],
      ['IP de loopback', 'https://127.0.0.1/client.json'],
      ['IP privado 10/8', 'https://10.0.0.5/client.json'],
      ['IP privado 192.168/16', 'https://192.168.1.10/client.json'],
      ['metadados de nuvem', 'https://169.254.169.254/latest/meta-data'],
      ['IPv6 loopback', 'https://[::1]/client.json'],
      ['IPv4 mapeado em IPv6', 'https://[::ffff:127.0.0.1]/client.json'],
      ['hostname que resolve a loopback', 'https://localhost/client.json'],
      ['porta não padrão', 'https://example.com:8443/client.json'],
      ['credenciais na URL', 'https://user:pass@example.com/client.json'],
      ['esquema file', 'file:///etc/passwd'],
    ])('recusa %s', async (_label, url) => {
      await expect(fetcher.fetch(url)).resolves.toEqual({
        ok: false,
        reason: 'blocked',
      });
    });
  });

  it('lê JSON válido e o max-age do Cache-Control', async () => {
    await expect(permissive().fetch(local('/ok'))).resolves.toEqual({
      ok: true,
      document: { client_id: 'x' },
      maxAgeSeconds: 600,
    });
  });

  it('aceita application/*+json', async () => {
    await expect(permissive().fetch(local('/ld'))).resolves.toMatchObject({
      ok: true,
    });
  });

  it('NÃO segue redirecionamento', async () => {
    await expect(permissive().fetch(local('/redirect'))).resolves.toEqual({
      ok: false,
      reason: 'redirect',
    });
    expect(internalHits).toBe(0);
  });

  it('recusa Content-Type que não é JSON', async () => {
    await expect(permissive().fetch(local('/html'))).resolves.toEqual({
      ok: false,
      reason: 'not_json',
    });
  });

  it('recusa corpo que não é JSON válido', async () => {
    await expect(permissive().fetch(local('/invalido'))).resolves.toEqual({
      ok: false,
      reason: 'not_json',
    });
  });

  it('recusa documento maior que 16 KB (não trunca)', async () => {
    await expect(permissive().fetch(local('/grande'))).resolves.toEqual({
      ok: false,
      reason: 'too_large',
    });
  });

  it('respeita o tempo máximo', async () => {
    await expect(permissive().fetch(local('/lento'))).resolves.toEqual({
      ok: false,
      reason: 'timeout',
    });
  });

  it('404 vira unreachable', async () => {
    await expect(permissive().fetch(local('/nada'))).resolves.toEqual({
      ok: false,
      reason: 'unreachable',
    });
  });
});
