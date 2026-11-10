import { ButtonLink } from '../components/ui/ButtonLink';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
      <span className="text-[13px] font-medium text-muted">Erro 404</span>
      <span className="mt-2 font-display text-[clamp(88px,16vw,140px)] font-semibold leading-[0.9] tracking-[-0.04em] text-line-strong">
        404
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold text-fg">
        Página não encontrada
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">
        Essa página saiu do mapa. O endereço acessado não existe ou foi movido.
        Volta pro quadro e continua de onde parou.
      </p>
      <ButtonLink to="/candidaturas" className="mt-6">
        Voltar para candidaturas
      </ButtonLink>
    </section>
  );
}
