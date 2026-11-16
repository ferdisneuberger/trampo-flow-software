import { describe, expect, it } from 'vitest';
import {
  RATE_LIMIT_RULES,
  rateLimitRule,
} from '../../src/infrastructure/metrics/rate-limit-rule';

describe('rateLimitRule', () => {
  it.each([
    ['google:ip:1.2.3.4', 'google'],
    ['register:ip:1.2.3.4', 'register'],
    ['verification:minute:1.2.3.4', 'verification'],
    ['verification:resend:user:abc', 'verification'],
    ['password:forgot:email:a@b.com', 'password'],
    ['preview:user:abc', 'preview'],
    ['pat:create:user:abc', 'pat_create'],
    ['pat:write:token-id', 'pat_write'],
    ['oauth:write:grant-id', 'oauth_write'],
    ['oauth:token:ip:1.2.3.4', 'oauth_token'],
    ['oauth:token:client:https://claude.ai/oauth/metadata', 'oauth_token'],
    ['oauth:register:ip:1.2.3.4', 'oauth_register'],
    ['oauth:decision:user:abc', 'oauth_decision'],
    ['admin:delete-user:minute:1.2.3.4', 'admin'],
  ])('%s -> %s', (key, rule) => {
    expect(rateLimitRule(key)).toBe(rule);
  });

  it('chave desconhecida vira other e o resto da chave nunca aparece', () => {
    expect(rateLimitRule('algo:novo:a@b.com')).toBe('other');
    expect(RATE_LIMIT_RULES).toContain('other');
  });
});
