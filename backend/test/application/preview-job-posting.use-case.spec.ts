import { describe, expect, it } from 'vitest';
import { PreviewJobPostingUseCase } from '../../src/application/applications/use-cases/preview-job-posting.use-case';
import {
  JobPageFetcher,
  type JobPageFetchResult,
} from '../../src/domain/applications/services/job-page-fetcher';

class FakeJobPageFetcher extends JobPageFetcher {
  readonly requested: string[] = [];

  constructor(private readonly result: JobPageFetchResult) {
    super();
  }

  fetch(url: string): Promise<JobPageFetchResult> {
    this.requested.push(url);

    return Promise.resolve(this.result);
  }
}

describe('PreviewJobPostingUseCase', () => {
  it('extrai os dados da página encontrada', async () => {
    const fetcher = new FakeJobPageFetcher({
      ok: true,
      finalUrl: 'https://carreiras.acme.com.br/vagas/1',
      html: '<meta property="og:title" content="Dev Backend | Acme"><meta property="og:site_name" content="Acme">',
    });
    const useCase = new PreviewJobPostingUseCase(fetcher);

    await expect(
      useCase.execute('https://acme.com.br/vaga-curta'),
    ).resolves.toEqual({
      title: 'Dev Backend',
      company: 'Acme',
      companyUrl: 'https://acme.com.br',
      status: 'found',
    });
    expect(fetcher.requested).toEqual(['https://acme.com.br/vaga-curta']);
  });

  it('informa quando a página não tem dados úteis', async () => {
    const useCase = new PreviewJobPostingUseCase(
      new FakeJobPageFetcher({
        ok: true,
        finalUrl: 'https://jobs.lever.co/acme/1',
        html: '<p>sem nada</p>',
      }),
    );

    await expect(
      useCase.execute('https://jobs.lever.co/acme/1'),
    ).resolves.toEqual({
      title: null,
      company: null,
      companyUrl: null,
      status: 'no_data',
    });
  });

  it.each(['blocked', 'timeout', 'not_html', 'unreachable'] as const)(
    'devolve campos nulos e o motivo quando a busca falha (%s)',
    async (reason) => {
      const useCase = new PreviewJobPostingUseCase(
        new FakeJobPageFetcher({ ok: false, reason }),
      );

      await expect(useCase.execute('https://acme.com/vaga')).resolves.toEqual({
        title: null,
        company: null,
        companyUrl: null,
        status: reason,
      });
    },
  );
});
