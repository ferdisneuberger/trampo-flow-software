import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { TrampoApiClient } from '../api-client.js';
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type Application,
  type ApplicationStatus,
} from '../types.js';
import { daysSince, ok, run, summarize } from './shared.js';

/** Só faz sentido cobrar andamento do que ainda está aberto. */
const OPEN_STATUSES: ApplicationStatus[] = ['PENDING', 'IN_PROGRESS'];
const MAX_STALE_PER_STATUS = 100;

export function registerPipelineSummary(
  server: McpServer,
  client: TrampoApiClient,
): void {
  server.registerTool(
    'pipeline_summary',
    {
      title: 'Resumo do funil',
      description:
        'Totais por status e candidaturas abertas (Aguardando ou Em andamento) sem atualização há pelo menos `staleDays` dias, das mais paradas para as menos. Bom ponto de partida para "o que preciso cobrar?".',
      inputSchema: {
        staleDays: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe('Dias sem atualização para considerar parada. Padrão: 7.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ staleDays = 7 }) =>
      run(async () => {
        const now = new Date();
        const [stats, ...pages] = await Promise.all([
          client.getStats(),
          ...OPEN_STATUSES.map((status) =>
            client.listApplications({
              status,
              sort: 'stale',
              limit: MAX_STALE_PER_STATUS,
            }),
          ),
        ]);

        const stale = pages
          .flatMap((page) => page.items)
          .filter(
            (application: Application) =>
              daysSince(application.updatedAt, now) >= staleDays,
          )
          .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
          .map((application) => summarize(application, now));

        return ok({
          total: stats.total,
          byStatus: Object.fromEntries(
            APPLICATION_STATUSES.map((status) => [
              status,
              {
                label: STATUS_LABELS[status],
                count: stats.byStatus[status] ?? 0,
              },
            ]),
          ),
          staleDays,
          staleCount: stale.length,
          stale,
        });
      }),
  );
}
