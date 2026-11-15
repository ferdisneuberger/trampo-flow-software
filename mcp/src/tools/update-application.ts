import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { TrampoApiClient } from '../api-client.js';
import {
  applicationIdSchema,
  detail,
  fail,
  ok,
  run,
  statusSchema,
} from './shared.js';

export function registerUpdateApplication(
  server: McpServer,
  client: TrampoApiClient,
): void {
  server.registerTool(
    'update_application',
    {
      title: 'Atualizar candidatura',
      description:
        'Atualiza campos de uma candidatura (por exemplo a fase atual depois de uma entrevista). Informe só o que muda; pelo menos um campo é obrigatório. Para só trocar de coluna no quadro, prefira move_application.',
      inputSchema: {
        id: applicationIdSchema,
        currentPhase: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .optional()
          .describe('Nova fase, por exemplo "Entrevista técnica".'),
        status: statusSchema.optional(),
        title: z.string().trim().min(1).max(120).optional(),
        company: z.string().trim().min(1).max(120).optional(),
        link: z.string().url().max(2048).optional(),
        companyUrl: z
          .string()
          .url()
          .max(2048)
          .nullable()
          .optional()
          .describe('Site da empresa; null remove.'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ id, ...fields }) =>
      run(async () => {
        const changes = Object.fromEntries(
          Object.entries(fields).filter(([, value]) => value !== undefined),
        );

        if (Object.keys(changes).length === 0) {
          return fail(
            'Informe pelo menos um campo para atualizar (currentPhase, status, title, company, link ou companyUrl).',
          );
        }

        return ok(detail(await client.updateApplication(id, changes)));
      }),
  );
}
