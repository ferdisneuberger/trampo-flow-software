import { Cable, type LucideIcon } from 'lucide-react';

export type SettingsSection = {
  id: string;
  label: string;
  /** Rota completa da seção. */
  path: string;
  description: string;
  icon: LucideIcon;
};

/**
 * Seções de Configurações: alimentam o submenu da barra lateral, o menu da
 * conta (celular) e a página inicial de Configurações. Para criar uma seção
 * nova: uma entrada aqui e uma `<Route>` em `App.tsx`.
 */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'mcp',
    label: 'MCP',
    path: '/configuracoes/mcp',
    description:
      'Conecte agentes de IA como o Claude, veja os aplicativos conectados e gerencie os tokens de integração.',
    icon: Cable,
  },
];
