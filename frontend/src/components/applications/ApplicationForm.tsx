import { PencilLine, Save, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApplicationForm } from '../../hooks/useApplicationForm';
import {
  APPLICATION_STATUS_OPTIONS,
  type Application,
  type ApplicationStatus,
  type CreateApplicationInput,
  type UpdateApplicationInput,
} from '../../services/applications.types';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { JobLinkPrefill } from './JobLinkPrefill';

export type ApplicationFormProps = {
  application?: Application | null;
  onCreate: (input: CreateApplicationInput) => Promise<unknown>;
  onUpdate: (id: string, input: UpdateApplicationInput) => Promise<unknown>;
  onCancel: () => void;
  onSuccess: () => void;
};

export function ApplicationForm({
  application = null,
  onCreate,
  onUpdate,
  onCancel,
  onSuccess,
}: ApplicationFormProps) {
  const form = useApplicationForm({
    application,
    onCreate,
    onUpdate,
    onSuccess,
  });
  // Ao criar, o formulário só aparece depois da busca pelo link ou quando a
  // pessoa escolhe preencher à mão. Na edição ele aparece sempre.
  const [isFormVisible, setIsFormVisible] = useState(Boolean(application));
  const [focusRequest, setFocusRequest] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (focusRequest === 0) {
      return;
    }

    const formElement = formRef.current;

    if (!formElement) {
      return;
    }

    const firstEmpty = [
      ...formElement.querySelectorAll<HTMLInputElement>('input[required]'),
    ].find((input) => input.value.trim() === '');
    const target =
      firstEmpty ??
      formElement.querySelector<HTMLButtonElement>('button[type="submit"]');

    target?.focus();
  }, [focusRequest]);

  function showForm() {
    setIsFormVisible(true);
    setFocusRequest((current) => current + 1);
  }

  const formElement = (
    <form
      ref={formRef}
      className="space-y-6"
      onSubmit={(event) => void form.handleSubmit(event)}
      noValidate
    >
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
          tag={form.prefilledFields.has('title') ? 'do link' : undefined}
          required
          maxLength={120}
          containerClassName="sm:col-span-2"
        />
        <Input
          label="Empresa"
          placeholder="Ex.: Acme"
          value={form.values.company}
          onChange={(event) => form.setField('company', event.target.value)}
          error={form.errors.company}
          tag={form.prefilledFields.has('company') ? 'do link' : undefined}
          required
          maxLength={120}
        />
        <Input
          label="Site da empresa"
          type="url"
          placeholder="https://empresa.com"
          value={form.values.companyUrl}
          onChange={(event) => form.setField('companyUrl', event.target.value)}
          error={form.errors.companyUrl}
          tag={form.prefilledFields.has('companyUrl') ? 'do link' : undefined}
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
          required
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
          required
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

  // Na edição o modal mostra só o formulário.
  if (application) {
    return formElement;
  }

  return (
    <div>
      <JobLinkPrefill onPrefill={form.applyPrefill} onFinished={showForm} />

      {isFormVisible ? (
        <div className="mt-6 border-t border-line pt-6">{formElement}</div>
      ) : (
        <>
          <p className="mt-4 text-[13px] text-muted">
            Não tem o link?{' '}
            <button
              type="button"
              onClick={showForm}
              className="inline-flex items-center gap-1 rounded-md font-medium text-fg underline underline-offset-4 hover:text-fg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30"
            >
              <PencilLine className="size-3.5" aria-hidden="true" />
              Preencher à mão
            </button>
          </p>

          <div className="mt-6 flex justify-end border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={onCancel}>
              <X className="size-4" aria-hidden="true" />
              Cancelar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
