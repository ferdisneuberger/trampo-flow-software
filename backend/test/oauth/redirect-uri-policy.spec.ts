import { describe, expect, it } from 'vitest';
import {
  isAllowedRedirectUri,
  matchesRegisteredRedirectUri,
} from '../../src/domain/oauth/redirect-uri-policy';

describe('política de redirect_uri (allowlist)', () => {
  it.each([
    'https://claude.ai/api/mcp/auth_callback',
    'https://claude.com/api/mcp/auth_callback',
    'http://localhost:53682/callback',
    'http://127.0.0.1:8080/callback',
    'http://[::1]:9000/callback',
    'http://localhost/callback',
  ])('permite %s', (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(true);
  });

  it.each([
    'https://evil.example/callback',
    'https://claude.ai.evil.example/api/mcp/auth_callback',
    'https://claude.ai/outro/caminho',
    'https://claude.ai@evil.example/api/mcp/auth_callback',
    'javascript:alert(1)',
    'data:text/html,<script>1</script>',
    '//evil.example/callback',
    'myapp://callback',
    'http://claude.ai/api/mcp/auth_callback',
    'http://evil.example:8080/callback',
    'http://localhost.evil.example/callback',
    'https://localhost/callback',
    'http://localhost/callback#frag',
    'http://user:pass@localhost/callback',
    'http://localhost/call back',
    '',
    `https://claude.ai/${'a'.repeat(2100)}`,
  ])('recusa %s', (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(false);
  });

  it('aceita extras configurados, só por igualdade exata', () => {
    const extra = ['https://app.example.com/oauth/callback'];

    expect(isAllowedRedirectUri(extra[0], extra)).toBe(true);
    expect(
      isAllowedRedirectUri('https://app.example.com/oauth/callback2', extra),
    ).toBe(false);
  });
});

describe('comparação do redirect_uri com os registrados', () => {
  const registered = [
    'https://claude.ai/api/mcp/auth_callback',
    'http://localhost:1111/callback',
  ];

  it('exige igualdade exata fora do loopback', () => {
    expect(
      matchesRegisteredRedirectUri(
        'https://claude.ai/api/mcp/auth_callback',
        registered,
      ),
    ).toBe(true);
    expect(
      matchesRegisteredRedirectUri(
        'https://claude.ai/api/mcp/auth_callback/',
        registered,
      ),
    ).toBe(false);
    expect(
      matchesRegisteredRedirectUri(
        'https://claude.ai/api/mcp/auth_callback?x=1',
        registered,
      ),
    ).toBe(false);
  });

  it('loopback ignora só a porta (RFC 8252)', () => {
    expect(
      matchesRegisteredRedirectUri(
        'http://localhost:9999/callback',
        registered,
      ),
    ).toBe(true);
    expect(
      matchesRegisteredRedirectUri('http://localhost:9999/outro', registered),
    ).toBe(false);
    expect(
      matchesRegisteredRedirectUri(
        'http://127.0.0.1:9999/callback',
        registered,
      ),
    ).toBe(false);
  });

  it('a exceção de porta não vale para hosts públicos', () => {
    expect(
      matchesRegisteredRedirectUri(
        'https://claude.ai:444/api/mcp/auth_callback',
        registered,
      ),
    ).toBe(false);
  });
});
