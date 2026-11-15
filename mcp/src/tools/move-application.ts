import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TrampoApiClient } from '../api-client.js';
import { STATUS_LABELS } from '../types.js';
import {
  applicationIdSchema,
  detail,
  ok,
  run,
  statusSchema,
} from './shared.js';

export function registerMoveApplication(
  server: McpServer,
  client: TrampoApiClient,
): void {
  server.registerTool(
    'move_application',
    {
      title: 'Mover no quadro',
      description:
        'Move a candidatura para outra coluna do quadro e a coloca no topo dela. Não altera a fase atual; para isso use update_application.',
      inputSchema: { id: applicationIdSchema, status: statusSchema },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    ({ id, status }) =>
      run(async () => {
        // Sem vizinho a API coloca no fim da coluna; o board ordena por posição,
        // então o primeiro item de cada coluna é o topo.
        const board = await client.getBoard({ limitPerColumn: 1 });
        const top = board.columns.find((column) => column.status === status)
          ?.items[0];

        if (top?.id === id) {
          return ok({
            moved: false,
            reason: `Já está no topo de ${STATUS_LABELS[status]}.`,
            application: detail(top),
          });
        }

        const moved = await client.placeApplication(
          id,
          top ? { status, afterId: top.id } : { status },
        );

        return ok({ moved: true, application: detail(moved) });
      }),
  );
}
