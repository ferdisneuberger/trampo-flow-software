import { Link } from 'react-router-dom';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';

const termsSections = [
  {
    title: 'Aceitação',
    body: 'Ao criar uma conta, você concorda com estes termos e com o uso da plataforma para acompanhar suas candidaturas de emprego.',
  },
  {
    title: 'Conta e segurança',
    body: 'Você é responsável por manter a confidencialidade da sua senha e pelas atividades realizadas na sua conta. Informe imediatamente se suspeitar de acesso não autorizado.',
  },
  {
    title: 'Uso adequado',
    body: 'A plataforma deve ser usada apenas para fins pessoais e legítimos. Não é permitido tentar acessar contas de outras pessoas, interferir no funcionamento do serviço ou automatizar acessos de forma abusiva.',
  },
  {
    title: 'Conteúdo e dados',
    body: 'As informações cadastradas são de sua responsabilidade. Usamos os dados para operar a conta, enviar e-mails de verificação e recuperação de senha e manter a segurança do serviço.',
  },
  {
    title: 'E-mails',
    body: 'Podemos enviar mensagens transacionais relacionadas ao cadastro, verificação de e-mail e recuperação de senha. Esses e-mails não têm finalidade de marketing.',
  },
  {
    title: 'Disponibilidade e limitações',
    body: 'O serviço pode passar por manutenções e não garante disponibilidade ininterrupta. Não nos responsabilizamos por decisões tomadas com base nas informações organizadas na plataforma.',
  },
  {
    title: 'Encerramento',
    body: 'Podemos suspender contas que violem estes termos ou comprometam a segurança do serviço.',
  },
  {
    title: 'Contato',
    body: 'Em caso de dúvidas sobre estes termos, responda ao e-mail de contato recebido do Trampo Flow.',
  },
];

export function TermsPage() {
  return (
    <AuthPageLayout tagline="Termos de uso" width="xl">
      <article className="text-sm leading-6 text-fg-soft">
        <header className="pb-8">
          <p className="text-[13px] font-medium text-muted">Documento</p>
          <h1 className="mt-1 font-display text-[32px] font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[40px]">
            Termos de uso do Trampo Flow
          </h1>
          <p className="mt-2 text-sm text-muted">Versão 2026-11</p>
        </header>

        <div>
          {termsSections.map((section, index) => (
            <section
              key={section.title}
              className="grid gap-1 border-t border-line py-5 sm:grid-cols-[2.5rem_1fr] sm:gap-3"
            >
              <span className="pt-0.5 text-[15px] font-semibold tabular-nums text-muted">
                {index + 1}
              </span>
              <div>
                <h2 className="font-display text-base font-semibold text-fg">
                  {section.title}
                </h2>
                <p className="mt-1 max-w-[62ch] text-[15px] leading-7 text-fg-soft">
                  {section.body}
                </p>
              </div>
            </section>
          ))}
        </div>

        <footer className="flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[13px] text-muted">
            Dúvidas? Responda ao e-mail de contato do Trampo Flow.
          </span>
          <Link
            to="/cadastro"
            className="text-sm font-medium text-fg underline underline-offset-4 hover:text-fg-soft"
          >
            Voltar para o cadastro
          </Link>
        </footer>
      </article>
    </AuthPageLayout>
  );
}
