export type AgentTabId =
  | 'claude'
  | 'code'
  | 'cursor'
  | 'vscode'
  | 'opencode'
  | 'others'
  | 'automation';

export type AgentDoc = { label: string; href: string };

/** Abas do painel "Como conectar", na ordem em que aparecem. */
export const AGENT_TABS: { id: AgentTabId; label: string }[] = [
  { id: 'claude', label: 'Claude' },
  { id: 'code', label: 'Claude Code' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'vscode', label: 'VS Code' },
  { id: 'opencode', label: 'OpenCode' },
  { id: 'others', label: 'Outros' },
  { id: 'automation', label: 'Automação' },
];

/** Documentação oficial de cada agente (conferida em 2026-11-15). */
export const AGENT_DOCS: Record<AgentTabId, AgentDoc | null> = {
  claude: {
    label: 'Conectores personalizados do Claude',
    href: 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp',
  },
  code: {
    label: 'Claude Code: conectar a ferramentas via MCP',
    href: 'https://code.claude.com/docs/en/mcp',
  },
  cursor: { label: 'Cursor: MCP', href: 'https://cursor.com/docs/mcp' },
  vscode: {
    label: 'VS Code: adicionar servidores MCP',
    href: 'https://code.visualstudio.com/docs/agent-customization/mcp-servers',
  },
  opencode: {
    label: 'OpenCode: servidores MCP',
    href: 'https://opencode.ai/docs/mcp-servers/',
  },
  others: {
    label: 'MCP: especificação de autorização',
    href: 'https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization',
  },
  automation: null,
};
