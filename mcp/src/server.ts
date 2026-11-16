import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { TrampoApiClient } from './api-client.js';
import type { McpMetrics } from './metrics.js';
import { registerPrompts } from './prompts.js';
import { registerCreateApplication } from './tools/create-application.js';
import { registerGetApplication } from './tools/get-application.js';
import { registerListApplications } from './tools/list-applications.js';
import { registerMoveApplication } from './tools/move-application.js';
import { registerPipelineSummary } from './tools/pipeline-summary.js';
import { registerPreviewJobPosting } from './tools/preview-job-posting.js';
import { registerUpdateApplication } from './tools/update-application.js';

export const SERVER_NAME = 'trampo-flow';
export const SERVER_VERSION = '3.4.1';

const INSTRUCTIONS = [
  'Ferramentas para acompanhar as candidaturas de emprego do usuário no Trampo Flow.',
  'Status (colunas do quadro): PENDING = Aguardando, IN_PROGRESS = Em andamento, COMPLETED = Finalizada, REJECTED = Recusada.',
  'A fase atual (currentPhase) é texto livre, por exemplo "Entrevista técnica".',
  'Para achar o id de uma candidatura, use list_applications com search.',
  'Nenhuma ferramenta apaga candidaturas e a API recusa exclusão por este acesso: excluir é feito pelo usuário na interface.',
  'Se o usuário quiser descartar uma candidatura, explique isso e ofereça movê-la para Recusada (REJECTED) ou Finalizada (COMPLETED) com move_application, perguntando qual faz sentido.',
].join(' ');

/** Mede cada ferramenta (resultado e duração) sem mexer no código de cada uma. */
function instrumentTools(server: McpServer, metrics: McpMetrics): void {
  const original = server.registerTool.bind(server) as (
    ...args: unknown[]
  ) => unknown;

  (server as unknown as { registerTool: unknown }).registerTool = (
    name: string,
    config: unknown,
    handler: (...args: unknown[]) => Promise<CallToolResult>,
  ) =>
    original(name, config, async (...args: unknown[]) => {
      const startedAt = performance.now();
      const seconds = () => (performance.now() - startedAt) / 1000;

      try {
        const result = await handler(...args);

        metrics.toolCall(name, result?.isError ? 'error' : 'ok', seconds());

        return result;
      } catch (error) {
        metrics.toolCall(name, 'error', seconds());

        throw error;
      }
    });
}

export function createServer(
  client: TrampoApiClient,
  metrics?: McpMetrics,
): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: INSTRUCTIONS },
  );

  if (metrics) {
    instrumentTools(server, metrics);
  }

  registerPreviewJobPosting(server, client);
  registerCreateApplication(server, client);
  registerListApplications(server, client);
  registerGetApplication(server, client);
  registerUpdateApplication(server, client);
  registerMoveApplication(server, client);
  registerPipelineSummary(server, client);
  registerPrompts(server);

  return server;
}
