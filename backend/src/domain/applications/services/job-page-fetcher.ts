/**
 * Motivos de falha ao buscar a página de uma vaga. Nenhum deles é erro do
 * usuário: a tela cai no preenchimento manual.
 */
export type JobPageFetchFailure =
  'blocked' | 'timeout' | 'not_html' | 'unreachable';

export type JobPageFetchResult =
  | { ok: true; html: string; finalUrl: string }
  | { ok: false; reason: JobPageFetchFailure };

/** Busca o HTML público da página de uma vaga. */
export abstract class JobPageFetcher {
  abstract fetch(url: string): Promise<JobPageFetchResult>;
}
