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

/** Fase sugerida ao criar: é o caso mais comum logo após se candidatar. */
export const DEFAULT_CURRENT_PHASE = 'Candidatura enviada';

const emptyValues: ApplicationFormValues = {
  title: '',
  link: '',
  company: '',
  companyUrl: '',
  currentPhase: DEFAULT_CURRENT_PHASE,
  status: 'PENDING',
};

/** Campos que o preenchimento pelo link pode sugerir. */
export type ApplicationPrefillField =
  'title' | 'company' | 'companyUrl' | 'link';

export type ApplicationPrefill = Partial<
  Record<ApplicationPrefillField, string | null>
>;

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
  /** Campos com valor vindo da página da vaga e ainda não editados. */
  const [prefilledFields, setPrefilledFields] = useState<
    ReadonlySet<ApplicationPrefillField>
  >(() => new Set());
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
      // Editou o campo: o valor passa a ser da pessoa, não mais do link.
      setPrefilledFields((current) => {
        if (!current.has(field as ApplicationPrefillField)) {
          return current;
        }

        const next = new Set(current);
        next.delete(field as ApplicationPrefillField);

        return next;
      });
    },
    [],
  );

  /**
   * Aplica valores sugeridos só nos campos vazios e devolve quais foram
   * preenchidos. O que a pessoa já digitou nunca é sobrescrito.
   */
  const applyPrefill = useCallback(
    (prefill: ApplicationPrefill): ApplicationPrefillField[] => {
      const filled: ApplicationPrefillField[] = [];
      const next = { ...values };

      for (const field of ['title', 'company', 'companyUrl', 'link'] as const) {
        const suggestion = prefill[field]?.trim();

        if (suggestion && !next[field].trim()) {
          next[field] = suggestion;
          filled.push(field);
        }
      }

      // O link foi colado pela própria pessoa; só marca o que veio da página.
      const fromPage = filled.filter((field) => field !== 'link');

      if (fromPage.length > 0) {
        setPrefilledFields((current) => new Set([...current, ...fromPage]));
      }

      if (filled.length > 0) {
        setValues(next);
        setErrors((current) => {
          const cleared = { ...current, form: undefined };

          for (const field of filled) {
            cleared[field] = undefined;
          }

          return cleared;
        });
      }

      return filled;
    },
    [values],
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
    prefilledFields,
    setField,
    applyPrefill,
    handleSubmit,
  };
}
