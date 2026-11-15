#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TrampoApiClient } from './api-client.js';
import { ConfigError, loadConfig } from './config.js';
import { createServer, SERVER_VERSION } from './server.js';

// stdout é do protocolo MCP: qualquer log vai para stderr.
async function main(): Promise<void> {
  const config = loadConfig();
  const client = new TrampoApiClient(config);
  const server = createServer(client);

  await server.connect(new StdioServerTransport());
  console.error(
    `[trampo-flow-mcp] v${SERVER_VERSION} conectado via stdio (API: ${config.apiUrl})`,
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof ConfigError
      ? error.message
      : `[trampo-flow-mcp] falha ao iniciar: ${String(error)}`,
  );
  process.exit(1);
});
