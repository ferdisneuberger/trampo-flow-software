import {
  CheckCircle2,
  ExternalLink,
  Paperclip,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useApplicationsContext } from '../../contexts/ApplicationsContext';
import { useApplicationForm } from '../../hooks/useApplicationForm';
import {
  APPLICATION_STATUS_OPTIONS,
  type Application,
  type ApplicationStatus,
} from '../../services/applications.types';
import { formatDate, formatFileSize } from '../../utils/format';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ApplicationFileUpload } from './ApplicationFileUpload';

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
  const { createApplication, updateApplication, addFiles } =
    useApplicationsContext();
  const form = useApplicationForm({
    application,
    onCreate: async (input) => {
      await createApplication(input);
    },
    onUpdate: async (id, input) => {
      await updateApplication(id, input);
    },
    onAddFiles: async (id, files) => {
      await addFiles(id, files);
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
          placeholder="Ex.: Desenvolvedor Frontend na Acme"
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

      {application && application.files.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">
              Arquivos já anexados
            </h3>
            <p className="mt-1 text-xs leading-5 text-ink-500">
              Os arquivos existentes permanecem vinculados à candidatura.
            </p>
          </div>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {application.files.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <Paperclip
                  className="size-4 shrink-0 text-brand-600"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {file.mimeType} · {formatFileSize(file.sizeInBytes)} ·
                    enviado em {formatDate(file.uploadedAt)}
                  </p>
                </div>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-lg p-2 text-ink-400 transition hover:bg-brand-50 hover:text-brand-700"
                  aria-label={`Abrir ${file.name}`}
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">
            Currículo e anexos
          </h3>
          <p className="mt-1 text-xs leading-5 text-ink-500">
            Selecione o currículo para preencher os metadados do arquivo e
            informe a URL pública usada pela API.
          </p>
        </div>

        <ApplicationFileUpload
          onFilesSelected={form.addFilesFromPicker}
          disabled={form.isSubmitting}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Anexos preparados ({form.files.length})
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={form.addFile}
            className="self-start sm:self-auto"
          >
            <Plus className="size-4" aria-hidden="true" />
            Adicionar manualmente
          </Button>
        </div>

        {form.errors.files && (
          <Alert
            tone="error"
            title="Verifique os arquivos"
            description={form.errors.files}
          />
        )}

        {form.files.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface/60 px-4 py-5 text-center text-xs text-ink-500">
            Nenhum arquivo selecionado. O currículo é opcional.
          </p>
        ) : (
          <div className="space-y-3">
            {form.files.map((file, index) => (
              <div
                key={file.clientId}
                className="rounded-xl border border-line bg-surface/60 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Paperclip
                      className="size-4 shrink-0 text-brand-600"
                      aria-hidden="true"
                    />
                    <p className="min-w-0 truncate text-sm font-semibold text-ink-900">
                      {file.name || `Arquivo ${index + 1}`}
                    </p>
                    {file.source === 'upload' && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                        Selecionado
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost-danger"
                    size="sm"
                    onClick={() => form.removeFile(file.clientId)}
                    aria-label={`Remover arquivo ${index + 1}`}
                    className="shrink-0"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Remover
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input
                    label="URL pública do arquivo"
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={file.url}
                    onChange={(event) =>
                      form.updateFile(file.clientId, 'url', event.target.value)
                    }
                    maxLength={2048}
                    containerClassName="sm:col-span-2"
                    hint="Cole o link público do currículo (Google Drive, Dropbox etc.)."
                  />
                  <Input
                    label="Nome do arquivo"
                    placeholder="curriculo.pdf"
                    value={file.name}
                    onChange={(event) =>
                      form.updateFile(file.clientId, 'name', event.target.value)
                    }
                    maxLength={255}
                  />
                  <Input
                    label="MIME type"
                    placeholder="application/pdf"
                    value={file.mimeType}
                    onChange={(event) =>
                      form.updateFile(
                        file.clientId,
                        'mimeType',
                        event.target.value,
                      )
                    }
                    maxLength={100}
                  />
                  <Input
                    label="Tamanho (bytes)"
                    type="number"
                    min={1}
                    step={1}
                    placeholder="102400"
                    value={file.sizeInBytes}
                    onChange={(event) =>
                      form.updateFile(
                        file.clientId,
                        'sizeInBytes',
                        event.target.value,
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={form.isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" isLoading={form.isSubmitting}>
          {application ? (
            <Save className="size-4" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          {application ? 'Salvar alterações' : 'Criar candidatura'}
        </Button>
      </div>
    </form>
  );
}
