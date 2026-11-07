import { ButtonLink } from '../components/ui/ButtonLink';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-12 text-center">
      <span className="inline-block -rotate-2 border-2 border-ink-900 bg-coral px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-on-coral shadow-hard-sm">
        Erro 404
      </span>
      <span className="mt-4 font-display text-[clamp(88px,16vw,150px)] font-extrabold leading-[0.8] tracking-[-0.09em] text-ink-900">
        404
      </span>
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-[-0.06em] text-ink-900">
        Página não encontrada
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
        Essa página saiu do mapa. O endereço acessado não existe ou foi movido.
        Volta pro quadro e continua de onde parou.
      </p>
      <ButtonLink to="/candidaturas" className="mt-6">
        Voltar para candidaturas
      </ButtonLink>
    </section>
  );
}
