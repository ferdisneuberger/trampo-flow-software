/**
 * Categoria fechada para o site de uma vaga. O host nunca vira rótulo: só uma
 * destas categorias (ou `other`), o que limita a cardinalidade e evita dado
 * pessoal nas métricas.
 */
const SOURCES: [string, string[]][] = [
  ['linkedin', ['linkedin.com']],
  ['gupy', ['gupy.io']],
  ['indeed', ['indeed.com', 'indeed.com.br']],
  ['greenhouse', ['greenhouse.io']],
  ['lever', ['lever.co']],
  ['workday', ['myworkdayjobs.com', 'workday.com']],
  ['catho', ['catho.com.br']],
  ['infojobs', ['infojobs.com.br']],
  ['vagas', ['vagas.com.br']],
  ['glassdoor', ['glassdoor.com', 'glassdoor.com.br']],
  ['solides', ['solides.jobs', 'solides.com.br']],
  ['programathor', ['programathor.com.br']],
];

export const SOURCE_BUCKETS = [...SOURCES.map(([name]) => name), 'other'];

export function sourceBucket(link: string): string {
  let host: string;

  try {
    host = new URL(link).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'other';
  }

  for (const [name, domains] of SOURCES) {
    if (domains.some((d) => host === d || host.endsWith(`.${d}`))) {
      return name;
    }
  }

  return 'other';
}
