import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { TrampoApiClient } from '../api-client.js';
import { ok, run, statusSchema, summarize } from './shared.js';

export function registerListApplications(
  server: McpServer,
  client: TrampoApiClient,
): void {
  server.registerTool(
    'list_applications',
    {
      title: 'Listar candidaturas',
      description:
        'Lista as candidaturas do usuário, das mais recentes para as mais antigas (ou das mais paradas, com sort=stale). Use para achar o id de uma candidatura pelo nome da vaga ou da empresa.',
      inputSchema: {
        status: statusSchema.optional(),
        search: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .optional()
          .describe('Busca por título, empresa ou fase atual.'),
        sort: z
          .enum(['recent', 'stale'])
          .optional()
          .describe(
            'recent (padrão): criadas por último primeiro. stale: atualizadas há mais tempo primeiro.',
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Máximo de itens (padrão 25).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ status, search, sort, limit }) =>
      run(async () => {
        const page = await client.listApplications({
          status,
          search,
          sort,
          limit: limit ?? 25,
        });
        const now = new Date();

        return ok({
          count: page.items.length,
          hasMore: page.hasMore,
          items: page.items.map((application) => summarize(application, now)),
        });
      }),
  );
}
