import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TrampoApiClient } from './api-client.js';
import { registerPrompts } from './prompts.js';
import { registerCreateApplication } from './tools/create-application.js';
import { registerGetApplication } from './tools/get-application.js';
import { registerListApplications } from './tools/list-applications.js';
import { registerMoveApplication } from './tools/move-application.js';
import { registerPipelineSummary } from './tools/pipeline-summary.js';
import { registerPreviewJobPosting } from './tools/preview-job-posting.js';
import { registerUpdateApplication } from './tools/update-application.js';

export const SERVER_NAME = 'trampo-flow';
export const SERVER_VERSION = '3.1.0';

const INSTRUCTIONS = [
  'Ferramentas para acompanhar as candidaturas de emprego do usuário no Trampo Flow.',
  'Status (colunas do quadro): PENDING = Aguardando, IN_PROGRESS = Em andamento, COMPLETED = Finalizada, REJECTED = Recusada.',
  'A fase atual (currentPhase) é texto livre, por exemplo "Entrevista técnica".',
  'Para achar o id de uma candidatura, use list_applications com search.',
  'Nenhuma ferramenta apaga candidaturas; excluir é feito pelo usuário na interface.',
].join(' ');

export function createServer(client: TrampoApiClient): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: INSTRUCTIONS },
  );

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
