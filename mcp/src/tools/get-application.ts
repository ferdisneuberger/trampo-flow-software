import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TrampoApiClient } from '../api-client.js';
import { applicationIdSchema, detail, ok, run } from './shared.js';

export function registerGetApplication(
  server: McpServer,
  client: TrampoApiClient,
): void {
  server.registerTool(
    'get_application',
    {
      title: 'Ver candidatura',
      description:
        'Devolve todos os dados de uma candidatura: vaga, empresa, links, status, fase atual e datas.',
      inputSchema: { id: applicationIdSchema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ id }) => run(async () => ok(detail(await client.getApplication(id)))),
  );
}
