import { Compass } from 'lucide-react';
import { ButtonLink } from '../components/ui/ButtonLink';
import { Card } from '../components/ui/Card';

export function NotFoundPage() {
  return (
    <Card className="mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Compass className="size-7" aria-hidden="true" />
      </span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
        Erro 404
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">
        Página não encontrada
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
        O endereço acessado não existe ou foi movido. Volte para o quadro de
        candidaturas para continuar acompanhando seus processos.
      </p>
      <ButtonLink to="/candidaturas" className="mt-6">
        Voltar para candidaturas
      </ButtonLink>
    </Card>
  );
}
