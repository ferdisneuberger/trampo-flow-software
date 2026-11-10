import { Loader2, Wand2 } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
} from 'react';
import type {
  ApplicationPrefill,
  ApplicationPrefillField,
} from '../../hooks/useApplicationForm';
import { applicationsService } from '../../services/api/applications.service';
import { cn } from '../../utils/cn';
import { getErrorMessage } from '../../utils/errors';
import { isHttpUrl } from '../../utils/validation';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

type JobLinkPrefillProps = {
  /** Aplica as sugestões no formulário e devolve os campos preenchidos. */
  onPrefill: (prefill: ApplicationPrefill) => ApplicationPrefillField[];
};

type Feedback = {
  tone: 'success' | 'neutral' | 'error';
  message: string;
};

const fieldLabels: Record<ApplicationPrefillField, string> = {
  title: 'título',
  company: 'empresa',
  companyUrl: 'site da empresa',
  link: 'link da vaga',
};

function joinLabels(fields: ApplicationPrefillField[]): string {
  const labels = fields.map((field) => fieldLabels[field]);

  if (labels.length <= 1) {
    return labels[0] ?? '';
  }

  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}

/**
 * Atalho do topo do modal "Nova candidatura": a pessoa cola o link da vaga e
 * os campos vazios do formulário abaixo são preenchidos com o que o servidor
 * conseguir ler da página. O formulário continua sempre editável.
 */
export function JobLinkPrefill({ onPrefill }: JobLinkPrefillProps) {
  const [link, setLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | undefined>();
  const controllerRef = useRef<AbortController | null>(null);
  const onPrefillRef = useRef(onPrefill);

  useEffect(() => {
    onPrefillRef.current = onPrefill;
  }, [onPrefill]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function runPrefill(rawLink: string) {
    const target = rawLink.trim();

    if (!isHttpUrl(target)) {
      setError('Cole um link HTTP ou HTTPS válido.');
      setFeedback(null);
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setError(undefined);
    setFeedback(null);
    setIsLoading(true);

    try {
      const preview = await applicationsService.preview(target, {
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      const filled = onPrefillRef.current({
        link: target,
        title: preview.title,
        company: preview.company,
        companyUrl: preview.companyUrl,
      });
      const filledData = filled.filter((field) => field !== 'link');

      if (preview.status !== 'found') {
        setFeedback({
          tone: 'neutral',
          message:
            'Não conseguimos ler os dados dessa página. Preencha os campos abaixo.',
        });
      } else if (filledData.length > 0) {
        setFeedback({
          tone: 'success',
          message: `Preenchemos ${joinLabels(filledData)}. Confira abaixo e complete o que faltar.`,
        });
      } else {
        setFeedback({
          tone: 'neutral',
          message:
            'Os campos já estavam preenchidos, então não alteramos nada.',
        });
      }
    } catch (requestError) {
      if (controller.signal.aborted) {
        return;
      }

      onPrefillRef.current({ link: target });
      setFeedback({
        tone: 'error',
        message: `${getErrorMessage(requestError)} Preencha os campos abaixo.`,
      });
    } finally {
      if (controllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runPrefill(link);
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').trim();

    if (!isHttpUrl(pasted)) {
      return;
    }

    event.preventDefault();
    setLink(pasted);
    void runPrefill(pasted);
  }

  return (
    <section aria-labelledby="job-link-prefill-title">
      <p id="job-link-prefill-title" className="text-sm font-semibold text-fg">
        Preencher pelo link da vaga
      </p>
      <p className="mt-0.5 text-[13px] text-muted">
        Cole o link e buscamos título, empresa e site. O que não encontrarmos,
        você completa abaixo.
      </p>

      <form
        className="mt-3 flex items-start gap-2"
        onSubmit={handleSubmit}
        noValidate
      >
        <Input
          label="Link para preencher automaticamente"
          hideLabel
          type="url"
          inputMode="url"
          placeholder="https://empresa.gupy.io/jobs/123"
          value={link}
          onChange={(event) => {
            setLink(event.target.value);
            setError(undefined);
          }}
          onPaste={handlePaste}
          error={error}
          maxLength={2048}
          containerClassName="min-w-0 flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          isLoading={isLoading}
          disabled={link.trim().length === 0}
        >
          {!isLoading && <Wand2 className="size-4" aria-hidden="true" />}
          Preencher
        </Button>
      </form>

      <div aria-live="polite" className="min-h-0">
        {isLoading ? (
          <p
            role="status"
            className="mt-2 flex items-center gap-1.5 text-[13px] text-muted"
          >
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Buscando dados da vaga…
          </p>
        ) : feedback ? (
          <p
            role="status"
            className={cn(
              'mt-2 text-[13px]',
              feedback.tone === 'success' && 'text-success',
              feedback.tone === 'neutral' && 'text-muted',
              feedback.tone === 'error' && 'text-danger',
            )}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
