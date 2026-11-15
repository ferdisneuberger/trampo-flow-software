import { ConnectedAppsSection } from '../components/settings/ConnectedAppsSection';
import { ConnectPanel } from '../components/settings/ConnectPanel';
import { PersonalAccessTokensSection } from '../components/settings/PersonalAccessTokensSection';
import { PageHeader } from '../components/ui/PageHeader';
import { useOAuthEnabled } from '../hooks/useOAuthGrants';

export function SettingsPage() {
  const oauthEnabled = useOAuthEnabled();

  return (
    <section className="mx-auto w-full max-w-3xl space-y-8">
      <PageHeader
        title="Configurações"
        description="Preferências da conta e integrações."
      />
      <ConnectPanel oauthEnabled={oauthEnabled} />
      {oauthEnabled && <ConnectedAppsSection />}
      <PersonalAccessTokensSection />
    </section>
  );
}
