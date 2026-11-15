import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'revisar_funil',
    {
      title: 'Revisar funil de candidaturas',
      description:
        'Analisa o funil e sugere próximos passos para as candidaturas paradas.',
      argsSchema: {
        staleDays: z
          .string()
          .optional()
          .describe('Dias sem atualização para considerar parada (padrão 7).'),
      },
    },
    ({ staleDays }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Chame pipeline_summary com staleDays=${Number(staleDays) || 7}.`,
              'Com o resultado:',
              '1. Resuma o funil em uma linha (totais por status).',
              '2. Liste as candidaturas paradas, das mais antigas para as mais recentes, com empresa, vaga, fase e dias parada.',
              '3. Sugira uma ação concreta para cada uma (mandar follow-up, pedir retorno, marcar como Recusada).',
              'Não altere nada sem eu confirmar.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
