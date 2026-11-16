import { Injectable, Optional } from '@nestjs/common';
import {
  JobPageFetcher,
  type JobPageFetchFailure,
} from '../../../domain/applications/services/job-page-fetcher';
import { AppMetrics, NoopAppMetrics } from '../../shared/metrics/app-metrics';
import {
  extractJobPosting,
  type JobPostingPreview,
} from '../services/extract-job-posting';

export type JobPostingPreviewStatus = 'found' | 'no_data' | JobPageFetchFailure;

export type JobPostingPreviewResult = JobPostingPreview & {
  status: JobPostingPreviewStatus;
};

/**
 * Busca a página da vaga e devolve o que der para preencher. Falhas de rede
 * não viram erro: voltam com `status` explicando o motivo e campos `null`,
 * para a tela seguir no preenchimento manual. Nada é gravado.
 */
@Injectable()
export class PreviewJobPostingUseCase {
  constructor(
    private readonly jobPageFetcher: JobPageFetcher,
    @Optional() private readonly metrics: AppMetrics = new NoopAppMetrics(),
  ) {}

  async execute(link: string): Promise<JobPostingPreviewResult> {
    const startedAt = performance.now();
    const page = await this.jobPageFetcher.fetch(link);
    const seconds = (): number => (performance.now() - startedAt) / 1000;

    if (!page.ok) {
      this.metrics.jobPreview(page.reason, link, seconds());

      return {
        title: null,
        company: null,
        companyUrl: null,
        status: page.reason,
      };
    }

    const preview = extractJobPosting(page.html, page.finalUrl);
    const hasData = Boolean(
      preview.title || preview.company || preview.companyUrl,
    );

    const status = hasData ? 'found' : 'no_data';

    this.metrics.jobPreview(status, link, seconds());

    return { ...preview, status };
  }
}
