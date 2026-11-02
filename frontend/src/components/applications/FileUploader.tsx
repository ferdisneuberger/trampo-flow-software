import { Upload } from 'lucide-react';
import { useId, useRef, useState, type DragEvent } from 'react';
import {
  MAX_FILES_PER_APPLICATION,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
} from '../../config/uploads';
import { getErrorMessage } from '../../utils/errors';
import { cn } from '../../utils/cn';

export { MAX_FILES_PER_APPLICATION, MAX_FILE_SIZE_BYTES };

const ALLOWED_EXTENSIONS = ['.pdf', '.txt'];
const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain'];

type FileUploaderProps = {
  onUpload: (file: File) => Promise<void>;
  remaining: number;
  disabled?: boolean;
};

function validateFile(file: File, remaining: number): string | null {
  if (remaining <= 0) {
    return `Limite de ${MAX_FILES_PER_APPLICATION} arquivos por candidatura atingido.`;
  }

  const name = file.name.toLowerCase();

  if (!ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return 'Envie apenas arquivos PDF ou TXT.';
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'O tipo do arquivo não corresponde a PDF ou TXT.';
  }

  if (file.size === 0) {
    return 'O arquivo está vazio.';
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `O arquivo deve ter no máximo ${MAX_FILE_SIZE_MB} MB.`;
  }

  return null;
}

export function FileUploader({
  onUpload,
  remaining,
  disabled = false,
}: FileUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || disabled) {
      return;
    }

    const selected = Array.from(files);

    setError(null);
    setIsUploading(true);

    try {
      for (const [index, file] of selected.entries()) {
        const validation = validateFile(file, remaining - index);

        if (validation) {
          setError(validation);
          break;
        }

        await onUpload(file);
      }
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setIsUploading(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void handleFiles(event.dataTransfer.files);
  };

  const isDisabled = disabled || isUploading || remaining <= 0;

  return (
    <div className="space-y-2">
      <div
        onDragOver={(event) => {
          if (isDisabled) {
            return;
          }

          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-card border border-dashed px-4 py-6 text-center transition',
          isDragging ? 'border-brand-400 bg-brand-50/60' : 'border-line',
          isDisabled && 'opacity-60',
        )}
      >
        <Upload className="mx-auto size-5 text-ink-500" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-ink-900">
          {isUploading
            ? 'Enviando...'
            : 'Arraste um arquivo ou escolha do disco'}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          PDF ou TXT, até {MAX_FILE_SIZE_MB} MB. Restam {Math.max(0, remaining)}{' '}
          de {MAX_FILES_PER_APPLICATION}.
        </p>

        <label
          htmlFor={inputId}
          className={cn(
            'mt-3 inline-flex h-9 items-center rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink-700',
            isDisabled
              ? 'cursor-not-allowed'
              : 'cursor-pointer hover:bg-surface',
          )}
        >
          Escolher arquivo
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          multiple
          className="sr-only"
          disabled={isDisabled}
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
