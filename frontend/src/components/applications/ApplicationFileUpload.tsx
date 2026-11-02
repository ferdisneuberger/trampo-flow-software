import { Info, Upload } from 'lucide-react';
import { useId, useState, type DragEvent } from 'react';
import { cn } from '../../utils/cn';

type ApplicationFileUploadProps = {
  onFilesSelected: (files: FileList | null) => void;
  disabled?: boolean;
};

export function ApplicationFileUpload({
  onFilesSelected,
  disabled = false,
}: ApplicationFileUploadProps) {
  const inputId = useId();
  const descriptionId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (disabled) {
      return;
    }

    onFilesSelected(event.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'rounded-2xl border-2 border-dashed px-5 py-6 text-center transition',
          isDragging
            ? 'border-brand-400 bg-brand-50/70'
            : 'border-line bg-surface/50',
          !disabled &&
            !isDragging &&
            'hover:border-brand-300 hover:bg-brand-50/40',
          disabled && 'opacity-60',
        )}
      >
        <label
          htmlFor={inputId}
          className={cn(
            'block rounded-xl focus-within:ring-2 focus-within:ring-brand-500/40',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          )}
        >
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Upload className="size-5" aria-hidden="true" />
          </span>
          <span className="mt-3 block text-sm font-semibold text-ink-900">
            Anexar currículo
          </span>
          <span className="mt-1 block text-xs leading-5 text-ink-500">
            Arraste o arquivo aqui ou clique para selecionar. Aceita PDF, DOC ou
            DOCX, inclusive mais de um arquivo.
          </span>
          <span className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-surface">
            <Upload className="size-4" aria-hidden="true" />
            Selecionar arquivo
          </span>
          <input
            id={inputId}
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            disabled={disabled}
            aria-describedby={descriptionId}
            onChange={(event) => {
              onFilesSelected(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
      </div>

      <div
        id={descriptionId}
        className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-700"
      >
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          O arquivo selecionado preenche nome, tipo e tamanho. A API armazena os
          metadados e a <strong>URL pública</strong> do documento — cole o link
          do currículo no campo abaixo.
        </p>
      </div>
    </div>
  );
}
