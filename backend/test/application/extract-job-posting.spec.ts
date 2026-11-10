import { describe, expect, it } from 'vitest';
import { extractJobPosting } from '../../src/application/applications/services/extract-job-posting';

function jsonLd(data: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

describe('extractJobPosting', () => {
  it('usa o JobPosting do JSON-LD como fonte principal', () => {
    const html = `<html><head>
      <title>Desenvolvedor Backend Pleno | Rota Logística</title>
      <meta property="og:site_name" content="Gupy">
      ${jsonLd({
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: 'Desenvolvedor Backend Pleno',
        hiringOrganization: {
          '@type': 'Organization',
          name: 'Rota Logística',
          sameAs: 'https://rotalogistica.com.br/',
        },
      })}
    </head></html>`;

    expect(
      extractJobPosting(html, 'https://rotalogistica.gupy.io/jobs/123'),
    ).toEqual({
      title: 'Desenvolvedor Backend Pleno',
      company: 'Rota Logística',
      companyUrl: 'https://rotalogistica.com.br',
    });
  });

  it('encontra o JobPosting dentro de @graph e com @type em lista', () => {
    const html = jsonLd({
      '@graph': [
        { '@type': 'WebPage' },
        {
          '@type': ['JobPosting'],
          title: 'Dev &amp; Ops',
          hiringOrganization: 'Faro Dados',
        },
      ],
    });

    expect(
      extractJobPosting(html, 'https://boards.greenhouse.io/faro/jobs/1'),
    ).toEqual({ title: 'Dev & Ops', company: 'Faro Dados', companyUrl: null });
  });

  it('usa a URL da organização e lista de sameAs, ignorando redes de vagas', () => {
    const html = jsonLd({
      '@type': 'JobPosting',
      title: 'Engenheira de Dados',
      hiringOrganization: [
        {
          name: 'Maré Mobilidade',
          sameAs: ['https://www.linkedin.com/company/mare', 'https://mare.com'],
        },
      ],
    });

    expect(extractJobPosting(html, 'https://jobs.lever.co/mare/1')).toEqual({
      title: 'Engenheira de Dados',
      company: 'Maré Mobilidade',
      companyUrl: 'https://mare.com',
    });
  });

  it('ignora JSON-LD quebrado e cai nas metatags', () => {
    const html = `
      <script type="application/ld+json">{ quebrado </script>
      <meta property="og:title" content="Engenheiro de Software | Nuvem Pagamentos">
      <meta property="og:site_name" content="Nuvem Pagamentos">`;

    expect(
      extractJobPosting(html, 'https://nuvempagamentos.com/vagas/9'),
    ).toEqual({
      title: 'Engenheiro de Software',
      company: 'Nuvem Pagamentos',
      companyUrl: 'https://nuvempagamentos.com',
    });
  });

  it('lê a página pública do LinkedIn', () => {
    const html = `
      <meta property="og:title" content="Nuvem Pagamentos hiring Software Engineer (Node.js) in São Paulo, SP | LinkedIn">
      <meta property="og:site_name" content="LinkedIn">`;

    expect(
      extractJobPosting(html, 'https://www.linkedin.com/jobs/view/4012345678'),
    ).toEqual({
      title: 'Software Engineer (Node.js)',
      company: 'Nuvem Pagamentos',
      companyUrl: null,
    });
  });

  it('lê o LinkedIn em português', () => {
    const html = `<meta property="og:title" content="Lumen Educação está contratando Desenvolvedor Backend em Curitiba, PR | LinkedIn">`;

    expect(
      extractJobPosting(html, 'https://br.linkedin.com/jobs/view/1'),
    ).toMatchObject({
      title: 'Desenvolvedor Backend',
      company: 'Lumen Educação',
    });
  });

  it('usa o <title> e o domínio de uma página de carreiras própria', () => {
    const html = `<title>Engenheiro Backend S&ecirc;nior - Carreiras</title>
      <meta name="og:site_name" content='Lumen Educação'>`;

    expect(
      extractJobPosting(html, 'https://carreiras.lumen.com.br/vagas/42'),
    ).toEqual({
      title: 'Engenheiro Backend Sênior',
      company: 'Lumen Educação',
      companyUrl: 'https://lumen.com.br',
    });
  });

  it('não corta hífens que fazem parte do título', () => {
    const html = '<title>Dev Front-end - Squad Pagamentos</title>';

    expect(extractJobPosting(html, 'https://acme.com/vaga').title).toBe(
      'Dev Front-end - Squad Pagamentos',
    );
  });

  it('não usa o nome da plataforma como empresa', () => {
    const html = `<meta property="og:title" content="Analista de Sistemas">
      <meta property="og:site_name" content="Gupy">`;

    expect(extractJobPosting(html, 'https://empresa.gupy.io/jobs/1')).toEqual({
      title: 'Analista de Sistemas',
      company: null,
      companyUrl: null,
    });
  });

  it('devolve tudo nulo quando não há nada aproveitável', () => {
    expect(
      extractJobPosting('<p>nada</p>', 'https://jobs.lever.co/x/1'),
    ).toEqual({ title: null, company: null, companyUrl: null });
  });

  it('limita o texto a 120 caracteres e decodifica entidades numéricas', () => {
    const longTitle = `Vaga &#233; ${'muito longa '.repeat(20)}`;
    const result = extractJobPosting(
      jsonLd({ '@type': 'JobPosting', title: longTitle }),
      'https://jobs.lever.co/x/1',
    );

    expect(result.title?.startsWith('Vaga é muito longa')).toBe(true);
    expect(result.title?.length).toBeLessThanOrEqual(120);
  });

  it('descarta site da empresa que não é http/https', () => {
    const html = jsonLd({
      '@type': 'JobPosting',
      title: 'Dev',
      hiringOrganization: { name: 'Acme', url: 'javascript:alert(1)' },
    });

    expect(extractJobPosting(html, 'https://acme.gupy.io/1').companyUrl).toBe(
      null,
    );
  });
});
