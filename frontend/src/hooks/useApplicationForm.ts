import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type {
  Application,
  ApplicationStatus,
  CreateApplicationFileInput,
  CreateApplicationInput,
  UpdateApplicationInput,
} from '../services/applications.types';
import { getErrorMessage } from '../utils/errors';
import { isHttpUrl } from '../utils/validation';

export type ApplicationFormValues = {
  title: string;
  link: string;
  currentPhase: string;
  status: ApplicationStatus;
};

export type ApplicationFileDraftSource = 'upload' | 'manual';

export type ApplicationFileDraft = {
  clientId: string;
  name: string;
  url: string;
  mimeType: string;
  sizeInBytes: string;
  source: ApplicationFileDraftSource;
};

type ApplicationFileDraftField = 'name' | 'url' | 'mimeType' | 'sizeInBytes';

export type ApplicationFormErrors = Partial<
  Record<'title' | 'link' | 'currentPhase' | 'files' | 'form', string>
>;

type UseApplicationFormOptions = {
  application?: Application | null;
  onCreate: (input: CreateApplicationInput) => Promise<void>;
  onUpdate: (id: string, input: UpdateApplicationInput) => Promise<void>;
  onAddFiles: (
    id: string,
    files: CreateApplicationFileInput[],
  ) => Promise<void>;
  onSuccess: () => void;
};

const emptyValues: ApplicationFormValues = {
  title: '',
  link: '',
  currentPhase: '',
  status: 'PENDING',
};

const MIME_TYPE_PATTERN =
  /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function inferMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';

  return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
}

function createClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toValues(application?: Application | null): ApplicationFormValues {
  if (!application) {
    return { ...emptyValues };
  }

  return {
    title: application.title,
    link: application.link,
    currentPhase: application.currentPhase,
    status: application.status,
  };
}

function validate(
  values: ApplicationFormValues,
  files: ApplicationFileDraft[],
): ApplicationFormErrors {
  const errors: ApplicationFormErrors = {};
  const title = values.title.trim();

  if (!title) {
    errors.title = 'Informe o título da candidatura.';
  } else if (title.length > 120) {
    errors.title = 'Use no máximo 120 caracteres.';
  }

  const link = values.link.trim();

  if (!link) {
    errors.link = 'Informe o link da vaga.';
  } else if (link.length > 2048) {
    errors.link = 'Use no máximo 2048 caracteres.';
  } else if (!isHttpUrl(link)) {
    errors.link = 'Informe uma URL HTTP ou HTTPS válida.';
  }

  const currentPhase = values.currentPhase.trim();

  if (!currentPhase) {
    errors.currentPhase = 'Informe a fase atual.';
  } else if (currentPhase.length > 120) {
    errors.currentPhase = 'Use no máximo 120 caracteres.';
  }

  for (const [index, file] of files.entries()) {
    const prefix = `Arquivo ${index + 1}:`;
    const name = file.name.trim();

    if (!name) {
      errors.files = `${prefix} informe o nome.`;
      break;
    }

    if (name.length > 255) {
      errors.files = `${prefix} o nome deve ter no máximo 255 caracteres.`;
      break;
    }

    const url = file.url.trim();

    if (!url) {
      errors.files = `${prefix} informe a URL pública do arquivo.`;
      break;
    }

    if (url.length > 2048) {
      errors.files = `${prefix} a URL deve ter no máximo 2048 caracteres.`;
      break;
    }

    if (!isHttpUrl(url)) {
      errors.files = `${prefix} informe uma URL HTTP ou HTTPS válida.`;
      break;
    }

    const mimeType = file.mimeType.trim();

    if (!mimeType) {
      errors.files = `${prefix} informe o MIME type.`;
      break;
    }

    if (mimeType.length > 100) {
      errors.files = `${prefix} o MIME type deve ter no máximo 100 caracteres.`;
      break;
    }

    if (!MIME_TYPE_PATTERN.test(mimeType)) {
      errors.files = `${prefix} use o formato type/subtype.`;
      break;
    }

    const sizeInBytes = Number(file.sizeInBytes);

    if (!Number.isInteger(sizeInBytes) || sizeInBytes <= 0) {
      errors.files = `${prefix} informe um tamanho em bytes maior que zero.`;
      break;
    }
  }

  return errors;
}

function toFileInput(file: ApplicationFileDraft): CreateApplicationFileInput {
  return {
    name: file.name.trim(),
    url: file.url.trim(),
    mimeType: file.mimeType.trim().toLowerCase(),
    sizeInBytes: Number(file.sizeInBytes),
  };
}

export function useApplicationForm({
  application = null,
  onCreate,
  onUpdate,
  onAddFiles,
  onSuccess,
}: UseApplicationFormOptions) {
  const [values, setValues] = useState<ApplicationFormValues>(() =>
    toValues(application),
  );
  const [files, setFiles] = useState<ApplicationFileDraft[]>([]);
  const [errors, setErrors] = useState<ApplicationFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setValues(toValues(application));
    setFiles([]);
    setErrors({});
  }, [application]);

  const setField = useCallback(
    <K extends keyof ApplicationFormValues>(
      field: K,
      value: ApplicationFormValues[K],
    ) => {
      setValues((current) => ({ ...current, [field]: value }));
      setErrors((current) => ({
        ...current,
        [field]: undefined,
        form: undefined,
      }));
    },
    [],
  );

  const addFile = useCallback(() => {
    setFiles((current) => [
      ...current,
      {
        clientId: createClientId(),
        name: '',
        url: '',
        mimeType: 'application/pdf',
        sizeInBytes: '',
        source: 'manual',
      },
    ]);
    setErrors((current) => ({
      ...current,
      files: undefined,
      form: undefined,
    }));
  }, []);

  const addFilesFromPicker = useCallback((fileList: FileList | null) => {
    const selectedFiles = fileList ? Array.from(fileList) : [];

    if (selectedFiles.length === 0) {
      return;
    }

    setFiles((current) => [
      ...current,
      ...selectedFiles.map((file) => ({
        clientId: createClientId(),
        name: file.name,
        url: '',
        mimeType: file.type || inferMimeType(file.name),
        sizeInBytes: String(file.size),
        source: 'upload' as const,
      })),
    ]);
    setErrors((current) => ({
      ...current,
      files: undefined,
      form: undefined,
    }));
  }, []);

  const updateFile = useCallback(
    (clientId: string, field: ApplicationFileDraftField, value: string) => {
      setFiles((current) =>
        current.map((file) =>
          file.clientId === clientId ? { ...file, [field]: value } : file,
        ),
      );
      setErrors((current) => ({
        ...current,
        files: undefined,
        form: undefined,
      }));
    },
    [],
  );

  const removeFile = useCallback((clientId: string) => {
    setFiles((current) => current.filter((file) => file.clientId !== clientId));
    setErrors((current) => ({
      ...current,
      files: undefined,
      form: undefined,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const nextErrors = validate(values, files);
      setErrors(nextErrors);

      if (Object.keys(nextErrors).length > 0) {
        return;
      }

      setIsSubmitting(true);
      let succeeded = false;

      try {
        const payload = {
          title: values.title.trim(),
          link: values.link.trim(),
          currentPhase: values.currentPhase.trim(),
          status: values.status,
        };
        const newFiles = files.map(toFileInput);

        if (application) {
          await onUpdate(application.id, payload);

          if (newFiles.length > 0) {
            await onAddFiles(application.id, newFiles);
          }
        } else {
          await onCreate({
            ...payload,
            files: newFiles.length > 0 ? newFiles : undefined,
          });
        }

        succeeded = true;
      } catch (error) {
        setErrors({ form: getErrorMessage(error) });
      } finally {
        setIsSubmitting(false);
      }

      if (succeeded) {
        onSuccess();
      }
    },
    [application, files, onAddFiles, onCreate, onSuccess, onUpdate, values],
  );

  return {
    values,
    files,
    errors,
    isSubmitting,
    setField,
    addFile,
    addFilesFromPicker,
    updateFile,
    removeFile,
    handleSubmit,
  };
}
