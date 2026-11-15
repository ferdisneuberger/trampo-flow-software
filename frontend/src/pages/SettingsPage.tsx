import { PersonalAccessTokensSection } from '../components/settings/PersonalAccessTokensSection';
import { PageHeader } from '../components/ui/PageHeader';

export function SettingsPage() {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-8">
      <PageHeader
        title="Configurações"
        description="Preferências da conta e integrações."
      />
      <PersonalAccessTokensSection />
    </section>
  );
}
