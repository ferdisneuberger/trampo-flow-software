import { describe, expect, it } from 'vitest';
import { describeQuery } from '../../src/infrastructure/metrics/runtime-gauges.service';

describe('describeQuery', () => {
  it.each([
    [
      'SELECT "public"."applications"."id" FROM "public"."applications" WHERE 1=1',
      { operation: 'select', table: 'applications' },
    ],
    [
      'INSERT INTO "public"."users" ("id") VALUES ($1)',
      { operation: 'insert', table: 'users' },
    ],
    [
      'UPDATE "public"."oauth_grants" SET "scope" = $1',
      { operation: 'update', table: 'oauth_grants' },
    ],
    [
      'DELETE FROM "public"."oauth_codes" WHERE 1=1',
      { operation: 'delete', table: 'oauth_codes' },
    ],
    ['BEGIN', { operation: 'begin', table: 'other' }],
    ['SELECT 1', { operation: 'select', table: 'other' }],
    [
      'SELECT * FROM "public"."tabela_inventada"',
      { operation: 'select', table: 'other' },
    ],
    ['?', { operation: 'other', table: 'other' }],
  ])('%s', (sql, expected) => {
    expect(describeQuery(sql)).toEqual(expected);
  });

  it('o SQL e os valores nunca fazem parte do resultado', () => {
    const result = describeQuery(
      `SELECT * FROM "public"."users" WHERE "email" = 'a@b.com'`,
    );

    expect(JSON.stringify(result)).not.toContain('a@b.com');
  });
});
