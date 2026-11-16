import { ConnectedAppsSection } from '../components/settings/ConnectedAppsSection';
import { ConnectPanel } from '../components/settings/ConnectPanel';
import { PersonalAccessTokensSection } from '../components/settings/PersonalAccessTokensSection';
import { useOAuthEnabled } from '../hooks/useOAuthGrants';

/** Configurações → MCP: como conectar, aplicativos conectados e tokens. */
export function McpSettingsPage() {
  const oauthEnabled = useOAuthEnabled();

  return (
    <div className="space-y-8">
      <ConnectPanel oauthEnabled={oauthEnabled} />
      {oauthEnabled && <ConnectedAppsSection />}
      <PersonalAccessTokensSection />
    </div>
  );
}
