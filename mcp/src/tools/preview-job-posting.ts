import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { TrampoApiClient } from '../api-client.js';
import { ok, run } from './shared.js';

export function registerPreviewJobPosting(
  server: McpServer,
  client: TrampoApiClient,
): void {
  server.registerTool(
    'preview_job_posting',
    {
      title: 'Ler página da vaga',
      description:
        'Lê a página de uma vaga e devolve título, empresa e site da empresa, sem gravar nada. Campos que a página não informa voltam nulos; `status` explica o motivo (found, no_data, blocked, timeout, not_html, unreachable).',
      inputSchema: {
        link: z
          .string()
          .url()
          .describe('URL da vaga (LinkedIn, Gupy, site da empresa etc.).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    ({ link }) => run(async () => ok(await client.previewJobPosting(link))),
  );
}
