import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type {
  Application,
  ApplicationStatus,
  CreateApplicationInput,
  UpdateApplicationInput,
} from '../services/applications.types';
import { getErrorMessage } from '../utils/errors';
import { isHttpUrl } from '../utils/validation';

export type ApplicationFormValues = {
  title: string;
  link: string;
  company: string;
  companyUrl: string;
  currentPhase: string;
  status: ApplicationStatus;
};

export type ApplicationFormErrors = Partial<
  Record<
    'title' | 'link' | 'company' | 'companyUrl' | 'currentPhase' | 'form',
    string
  >
>;

type UseApplicationFormOptions = {
  application?: Application | null;
  onCreate: (input: CreateApplicationInput) => Promise<unknown>;
  onUpdate: (id: string, input: UpdateApplicationInput) => Promise<unknown>;
  onSuccess: () => void;
};

const emptyValues: ApplicationFormValues = {
  title: '',
  link: '',
  company: '',
  companyUrl: '',
  currentPhase: '',
  status: 'PENDING',
};

function toValues(application?: Application | null): ApplicationFormValues {
  if (!application) {
    return { ...emptyValues };
  }

  return {
    title: application.title,
    link: application.link,
    company: application.company,
    companyUrl: application.companyUrl ?? '',
    currentPhase: application.currentPhase,
    status: application.status,
  };
}

function validate(values: ApplicationFormValues): ApplicationFormErrors {
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

  const company = values.company.trim();

  if (!company) {
    errors.company = 'Informe a empresa.';
  } else if (company.length < 2) {
    errors.company = 'Use pelo menos 2 caracteres.';
  } else if (company.length > 120) {
    errors.company = 'Use no máximo 120 caracteres.';
  }

  const companyUrl = values.companyUrl.trim();

  if (companyUrl && companyUrl.length > 2048) {
    errors.companyUrl = 'Use no máximo 2048 caracteres.';
  } else if (companyUrl && !isHttpUrl(companyUrl)) {
    errors.companyUrl = 'Informe uma URL HTTP ou HTTPS válida.';
  }

  const currentPhase = values.currentPhase.trim();

  if (!currentPhase) {
    errors.currentPhase = 'Informe a fase atual.';
  } else if (currentPhase.length > 120) {
    errors.currentPhase = 'Use no máximo 120 caracteres.';
  }

  return errors;
}

export function useApplicationForm({
  application = null,
  onCreate,
  onUpdate,
  onSuccess,
}: UseApplicationFormOptions) {
  const [values, setValues] = useState<ApplicationFormValues>(() =>
    toValues(application),
  );
  const [errors, setErrors] = useState<ApplicationFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentApplicationId = application?.id ?? null;
  const lastApplicationId = useRef(currentApplicationId);

  useEffect(() => {
    if (lastApplicationId.current === currentApplicationId) {
      return;
    }

    lastApplicationId.current = currentApplicationId;
    setValues(toValues(application));
    setErrors({});
  }, [application, currentApplicationId]);

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

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const nextErrors = validate(values);
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
          company: values.company.trim(),
          companyUrl: values.companyUrl.trim() || null,
          currentPhase: values.currentPhase.trim(),
          status: values.status,
        };

        if (application) {
          await onUpdate(application.id, payload);
        } else {
          await onCreate(payload);
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
    [application, onCreate, onSuccess, onUpdate, values],
  );

  return {
    values,
    errors,
    isSubmitting,
    setField,
    handleSubmit,
  };
}
