import { Save, X } from 'lucide-react';
import { useApplications } from '../../hooks/useApplications';
import { useApplicationForm } from '../../hooks/useApplicationForm';
import {
  APPLICATION_STATUS_OPTIONS,
  type Application,
  type ApplicationStatus,
} from '../../services/applications.types';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

type ApplicationFormProps = {
  application?: Application | null;
  onCancel: () => void;
  onSuccess: () => void;
};

export function ApplicationForm({
  application = null,
  onCancel,
  onSuccess,
}: ApplicationFormProps) {
  const { createApplication, updateApplication } = useApplications();
  const form = useApplicationForm({
    application,
    onCreate: async (input) => {
      await createApplication(input);
    },
    onUpdate: async (id, input) => {
      await updateApplication(id, input);
    },
    onSuccess,
  });

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit} noValidate>
      {form.errors.form && (
        <Alert
          tone="error"
          title="Não foi possível salvar a candidatura"
          description={form.errors.form}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Título da candidatura"
          placeholder="Ex.: Desenvolvedor Frontend"
          value={form.values.title}
          onChange={(event) => form.setField('title', event.target.value)}
          error={form.errors.title}
          maxLength={120}
          containerClassName="sm:col-span-2"
          autoFocus
        />
        <Input
          label="Empresa"
          placeholder="Ex.: Acme"
          value={form.values.company}
          onChange={(event) => form.setField('company', event.target.value)}
          error={form.errors.company}
          maxLength={120}
        />
        <Input
          label="Site da empresa"
          type="url"
          placeholder="https://empresa.com"
          value={form.values.companyUrl}
          onChange={(event) => form.setField('companyUrl', event.target.value)}
          error={form.errors.companyUrl}
          hint="Opcional. URL HTTP ou HTTPS."
          maxLength={2048}
        />
        <Input
          label="Link da vaga"
          type="url"
          placeholder="https://empresa.com/vagas/frontend"
          value={form.values.link}
          onChange={(event) => form.setField('link', event.target.value)}
          error={form.errors.link}
          hint="Informe uma URL HTTP ou HTTPS."
          maxLength={2048}
          containerClassName="sm:col-span-2"
        />
        <Input
          label="Fase atual"
          placeholder="Ex.: Entrevista técnica"
          value={form.values.currentPhase}
          onChange={(event) =>
            form.setField('currentPhase', event.target.value)
          }
          error={form.errors.currentPhase}
          maxLength={120}
        />
        <Select
          label="Status"
          options={APPLICATION_STATUS_OPTIONS}
          value={form.values.status}
          onChange={(event) =>
            form.setField('status', event.target.value as ApplicationStatus)
          }
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={form.isSubmitting}
        >
          <X className="size-4" aria-hidden="true" />
          Cancelar
        </Button>
        <Button type="submit" isLoading={form.isSubmitting}>
          <Save className="size-4" aria-hidden="true" />
          {application ? 'Salvar alterações' : 'Criar candidatura'}
        </Button>
      </div>
    </form>
  );
}
