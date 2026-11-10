/**
 * Extrai título, empresa e site da empresa do HTML da página de uma vaga.
 * Função pura, sem rede.
 *
 * Ordem de prioridade:
 *   1. JSON-LD `JobPosting` (schema.org), publicado pela maioria das
 *      plataformas para o Google indexar vagas;
 *   2. metatags (`og:title`, `og:site_name`, `twitter:title`);
 *   3. `<title>` e a origem do link (para o site da empresa).
 *
 * Tudo que não for encontrado volta como `null`.
 */
export type JobPostingPreview = {
  title: string | null;
  company: string | null;
  companyUrl: string | null;
};

const MAX_TEXT_LENGTH = 120;
const MIN_COMPANY_LENGTH = 2;
const MAX_URL_LENGTH = 2048;

/** Domínios de plataformas de vagas: nunca viram "site da empresa". */
const JOB_BOARD_DOMAINS = [
  '99jobs.com',
  'abler.com.br',
  'ashbyhq.com',
  'bamboohr.com',
  'breezy.hr',
  'catho.com.br',
  'compleo.com.br',
  'glassdoor.com',
  'glassdoor.com.br',
  'greenhouse.io',
  'gupy.io',
  'indeed.com',
  'infojobs.com.br',
  'inhire.app',
  'jobs.quickin.io',
  'kenoby.com',
  'lever.co',
  'linkedin.com',
  'myworkdayjobs.com',
  'pandape.com.br',
  'programathor.com.br',
  'recrutei.com.br',
  'remotar.com.br',
  'smartrecruiters.com',
  'solides.jobs',
  'trampos.co',
  'vagas.com.br',
  'workable.com',
  'workday.com',
];

/** Nomes de plataformas que aparecem como "site" no lugar da empresa. */
const PLATFORM_NAMES = new Set(
  [
    '99jobs',
    'abler',
    'ashby',
    'bamboohr',
    'breezy',
    'breezy hr',
    'carreiras',
    'careers',
    'catho',
    'glassdoor',
    'greenhouse',
    'gupy',
    'indeed',
    'infojobs',
    'inhire',
    'jobs',
    'kenoby',
    'lever',
    'linkedin',
    'programathor',
    'quickin',
    'recrutei',
    'remotar',
    'smartrecruiters',
    'solides',
    'sólides',
    'trabalhe conosco',
    'trampos',
    'vagas',
    'vagas.com',
    'vagas.com.br',
    'workable',
    'workday',
  ].map((name) => name.toLowerCase()),
);

/** Primeiro rótulo de subdomínios de páginas de carreira. */
const CAREER_SUBDOMAINS = new Set([
  'careers',
  'carreiras',
  'jobs',
  'talentos',
  'trabalheconosco',
  'vagas',
  'www',
]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  middot: '·',
  aacute: 'á',
  acirc: 'â',
  agrave: 'à',
  atilde: 'ã',
  ccedil: 'ç',
  eacute: 'é',
  ecirc: 'ê',
  iacute: 'í',
  oacute: 'ó',
  ocirc: 'ô',
  otilde: 'õ',
  uacute: 'ú',
  Aacute: 'Á',
  Acirc: 'Â',
  Agrave: 'À',
  Atilde: 'Ã',
  Ccedil: 'Ç',
  Eacute: 'É',
  Ecirc: 'Ê',
  Iacute: 'Í',
  Oacute: 'Ó',
  Ocirc: 'Ô',
  Otilde: 'Õ',
  Uacute: 'Ú',
};

export function extractJobPosting(
  html: string,
  pageUrl: string,
): JobPostingPreview {
  const jobPosting = findJobPosting(html);
  const meta = readMetaTags(html);

  const organization = jobPosting
    ? readOrganization(jobPosting.hiringOrganization)
    : null;

  const company =
    cleanCompany(organization?.name) ?? cleanCompany(meta.get('og:site_name'));

  const linkedIn = parseLinkedInTitle(meta.get('og:title'));

  const title =
    cleanText(asString(jobPosting?.title)) ??
    cleanTitle(linkedIn?.title, company) ??
    cleanTitle(meta.get('og:title'), company) ??
    cleanTitle(meta.get('twitter:title'), company) ??
    cleanTitle(readTitleTag(html), company);

  const companyUrl =
    firstCompanyUrl(organization?.urls ?? []) ?? companyUrlFromPage(pageUrl);

  return {
    title,
    company: company ?? cleanCompany(linkedIn?.company),
    companyUrl,
  };
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

type JsonObject = Record<string, unknown>;

function findJobPosting(html: string): JsonObject | null {
  const scripts = html.matchAll(
    /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const [, raw] of scripts) {
    const parsed = parseJson(raw);

    if (parsed === undefined) {
      continue;
    }

    const found = findNodeOfType(parsed, 'JobPosting', 0);

    if (found) {
      return found;
    }
  }

  return null;
}

function parseJson(raw: string | undefined): unknown {
  if (!raw) {
    return undefined;
  }

  const cleaned = raw
    .trim()
    .replace(/^<!--/, '')
    .replace(/-->$/, '')
    .replace(/^\s*\/\/\s*<!\[CDATA\[/, '')
    .replace(/\/\/\s*\]\]>\s*$/, '')
    .trim();

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    return undefined;
  }
}

function findNodeOfType(
  node: unknown,
  type: string,
  depth: number,
): JsonObject | null {
  if (depth > 6 || node === null || typeof node !== 'object') {
    return null;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findNodeOfType(item, type, depth + 1);

      if (found) {
        return found;
      }
    }

    return null;
  }

  const object = node as JsonObject;
  const nodeType = object['@type'];
  const types = Array.isArray(nodeType) ? nodeType : [nodeType];

  if (types.includes(type)) {
    return object;
  }

  return findNodeOfType(object['@graph'], type, depth + 1);
}

function readOrganization(
  value: unknown,
): { name: string | null; urls: string[] } | null {
  const first = Array.isArray(value) ? (value[0] as unknown) : value;

  if (typeof first === 'string') {
    return { name: first, urls: [] };
  }

  if (!first || typeof first !== 'object') {
    return null;
  }

  const organization = first as JsonObject;
  const sameAs = organization.sameAs;
  const sameAsUrls = Array.isArray(sameAs)
    ? sameAs.filter((item): item is string => typeof item === 'string')
    : [asString(sameAs)];

  return {
    name: asString(organization.name),
    urls: [...sameAsUrls, asString(organization.url)].filter(
      (url): url is string => Boolean(url),
    ),
  };
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

// ---------------------------------------------------------------------------
// HTML: metatags e <title>
// ---------------------------------------------------------------------------

function readMetaTags(html: string): Map<string, string> {
  const meta = new Map<string, string>();

  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = readAttributes(tag);
    const key = (attributes.get('property') ?? attributes.get('name'))
      ?.trim()
      .toLowerCase();
    const content = attributes.get('content');

    if (key && content !== undefined && !meta.has(key)) {
      meta.set(key, content);
    }
  }

  return meta;
}

function readAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const pattern =
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

  for (const match of tag.matchAll(pattern)) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = match;

    attributes.set(
      name.toLowerCase(),
      doubleQuoted ?? singleQuoted ?? unquoted ?? '',
    );
  }

  return attributes;
}

function readTitleTag(html: string): string | null {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);

  return match?.[1] ?? null;
}

// ---------------------------------------------------------------------------
// Limpeza
// ---------------------------------------------------------------------------

function decodeEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi,
    (entity, code: string) => {
      if (code[0] === '#') {
        const isHex = code[1] === 'x' || code[1] === 'X';
        const number = Number.parseInt(
          code.slice(isHex ? 2 : 1),
          isHex ? 16 : 10,
        );

        return Number.isFinite(number) && number > 0 && number <= 0x10ffff
          ? String.fromCodePoint(number)
          : entity;
      }

      return NAMED_ENTITIES[code] ?? entity;
    },
  );
}

function cleanText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const text = decodeEntities(value.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return null;
  }

  return text.length > MAX_TEXT_LENGTH
    ? text.slice(0, MAX_TEXT_LENGTH).trim()
    : text;
}

/**
 * Remove sufixos de site do título ("Vaga X | Gupy", "Vaga X - Empresa").
 * Só corta pedaços que sejam nome de plataforma ou da própria empresa, para
 * não mutilar títulos que têm hífen no meio.
 */
function cleanTitle(
  value: string | null | undefined,
  company: string | null,
): string | null {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const separators = /\s+[|\-–—·•:]\s+/;
  const parts = text.split(separators);
  const companyKey = company?.toLowerCase();

  while (parts.length > 1) {
    const last = (parts[parts.length - 1] ?? '').trim().toLowerCase();

    if (isPlatformName(last) || (companyKey && last === companyKey)) {
      parts.pop();
      continue;
    }

    break;
  }

  return cleanText(parts.join(' - '));
}

function cleanCompany(value: string | null | undefined): string | null {
  const text = cleanText(value);

  if (!text || text.length < MIN_COMPANY_LENGTH || isPlatformName(text)) {
    return null;
  }

  return text;
}

function isPlatformName(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return (
    PLATFORM_NAMES.has(normalized) ||
    [...PLATFORM_NAMES].some(
      (name) =>
        normalized === `${name} jobs` ||
        normalized === `vagas ${name}` ||
        normalized === `${name} vagas`,
    )
  );
}

/**
 * LinkedIn (página pública): "Empresa hiring Título in Local | LinkedIn" ou
 * "Empresa está contratando Título em Local | LinkedIn".
 */
function parseLinkedInTitle(
  value: string | undefined,
): { company: string; title: string } | null {
  const text = cleanText(value)?.replace(/\s*\|\s*LinkedIn\s*$/i, '');

  if (!text) {
    return null;
  }

  const match =
    /^(.+?)\s+(?:hiring|está contratando|esta contratando|contrata)\s+(.+?)(?:\s+(?:in|em)\s+[^,]+(?:,.*)?)?$/i.exec(
      text,
    );

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return { company: match[1], title: match[2] };
}

function firstCompanyUrl(candidates: string[]): string | null {
  for (const candidate of candidates) {
    const url = cleanCompanyUrl(candidate);

    if (url) {
      return url;
    }
  }

  return null;
}

function cleanCompanyUrl(value: string | null | undefined): string | null {
  const text = value?.trim();

  if (!text || text.length > MAX_URL_LENGTH) {
    return null;
  }

  const url = parseHttpUrl(text);

  if (!url || isJobBoardHost(url.hostname)) {
    return null;
  }

  const isRoot = url.pathname === '/' && !url.search && !url.hash;

  return isRoot ? `${url.protocol}//${url.host}` : url.toString();
}

/**
 * Sem dado da empresa, usa o domínio da própria página quando ela não é de
 * uma plataforma de vagas: `https://carreiras.acme.com.br/vaga/1` vira
 * `https://acme.com.br`.
 */
function companyUrlFromPage(pageUrl: string): string | null {
  const url = parseHttpUrl(pageUrl);

  if (!url || isJobBoardHost(url.hostname)) {
    return null;
  }

  const labels = url.hostname.split('.');

  if (labels.length > 2 && CAREER_SUBDOMAINS.has(labels[0] ?? '')) {
    labels.shift();
  }

  return `${url.protocol}//${labels.join('.')}`;
}

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function isJobBoardHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  return JOB_BOARD_DOMAINS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}
