import { describe, expect, it } from 'vitest';
import {
  SOURCE_BUCKETS,
  sourceBucket,
} from '../../src/infrastructure/metrics/source-bucket';

describe('sourceBucket', () => {
  it.each([
    ['https://www.linkedin.com/jobs/view/123', 'linkedin'],
    ['https://br.linkedin.com/jobs/view/123', 'linkedin'],
    ['https://empresa.gupy.io/jobs/99', 'gupy'],
    ['https://br.indeed.com/viewjob?jk=1', 'indeed'],
    ['https://boards.greenhouse.io/acme/jobs/1', 'greenhouse'],
    ['https://jobs.lever.co/acme/1', 'lever'],
    ['https://acme.wd1.myworkdayjobs.com/x', 'workday'],
    ['https://www.catho.com.br/vagas/x', 'catho'],
    ['https://www.vagas.com.br/v1', 'vagas'],
  ])('%s -> %s', (link, expected) => {
    expect(sourceBucket(link)).toBe(expected);
  });

  it.each([
    'https://acme-careers.example.com/vaga/1',
    'https://linkedin.com.evil.example/jobs',
    'https://notlinkedin.com/jobs',
    'não é url',
    '',
    'javascript:alert(1)',
  ])('%s -> other (host nunca vira rótulo)', (link) => {
    expect(sourceBucket(link)).toBe('other');
  });

  it('só devolve categorias da lista fechada', () => {
    for (const link of ['https://a.com', 'https://gupy.io/x', 'x']) {
      expect(SOURCE_BUCKETS).toContain(sourceBucket(link));
    }
  });
});
