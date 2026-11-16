import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConnectedAppsSection } from '../components/settings/ConnectedAppsSection';
import { ConnectPanel } from '../components/settings/ConnectPanel';
import { PersonalAccessTokensSection } from '../components/settings/PersonalAccessTokensSection';
import { PageHeader } from '../components/ui/PageHeader';
import { useOAuthEnabled } from '../hooks/useOAuthGrants';

/** Configurações → MCP: como conectar, aplicativos conectados e tokens. */
export function McpSettingsPage() {
  const oauthEnabled = useOAuthEnabled();

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8">
      <div className="space-y-3">
        <Link
          to="/configuracoes"
          className="inline-flex items-center gap-1 rounded-btn text-[13px] font-medium text-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Configurações
        </Link>
        <PageHeader
          title="MCP"
          description="Conecte agentes de IA à sua conta e gerencie os acessos."
        />
      </div>
      <ConnectPanel oauthEnabled={oauthEnabled} />
      {oauthEnabled && <ConnectedAppsSection />}
      <PersonalAccessTokensSection />
    </section>
  );
}
