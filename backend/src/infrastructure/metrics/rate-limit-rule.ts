/**
 * Regra do limitador a partir do prefixo da chave (`google:ip:1.2.3.4` ->
 * `google`). O resto da chave (IP, e-mail, id, URL do cliente) nunca vira
 * rótulo; chaves com `:` dentro (URLs) por isso são mapeadas por prefixo
 * conhecido, e não por `split` genérico.
 */
const PREFIXES: [string, string][] = [
  ['google:', 'google'],
  ['register:', 'register'],
  ['verification:', 'verification'],
  ['password:', 'password'],
  ['preview:', 'preview'],
  ['pat:create', 'pat_create'],
  ['pat:write', 'pat_write'],
  ['oauth:write', 'oauth_write'],
  ['oauth:token', 'oauth_token'],
  ['oauth:register', 'oauth_register'],
  ['oauth:decision', 'oauth_decision'],
  ['admin:', 'admin'],
];

export const RATE_LIMIT_RULES = [...PREFIXES.map(([, rule]) => rule), 'other'];

export function rateLimitRule(key: string): string {
  return PREFIXES.find(([prefix]) => key.startsWith(prefix))?.[1] ?? 'other';
}
