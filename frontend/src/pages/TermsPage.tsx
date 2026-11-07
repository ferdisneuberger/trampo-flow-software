import { Link } from 'react-router-dom';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { Card } from '../components/ui/Card';

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
      <Card className="p-6 text-sm leading-6 text-ink-700 sm:p-8">
        <header className="border-b-2 border-dashed border-ink-900/20 pb-5">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-coral-dark">
            Documento
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.06em] text-ink-900">
            Termos de uso do Trampo Flow
          </h1>
          <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-500">
            Versão 2026-11
          </p>
        </header>

        <div className="mt-6 space-y-6">
          {termsSections.map((section, index) => (
            <section
              key={section.title}
              className="grid gap-3 sm:grid-cols-[2rem_1fr]"
            >
              <span className="grid size-8 place-items-center rounded-md border-2 border-ink-900 bg-yellow font-mono text-[10px] font-bold text-on-accent shadow-hard-sm">
                {index + 1}
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-ink-900">
                  {section.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-ink-700">
                  {section.body}
                </p>
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-8 flex flex-col gap-2 border-t-2 border-dashed border-ink-900/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-ink-500">
            Dúvidas? Responda ao e-mail de contato do Trampo Flow.
          </span>
          <Link
            to="/cadastro"
            className="font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-ink-900 underline underline-offset-4 hover:text-coral-dark"
          >
            Voltar para o cadastro
          </Link>
        </footer>
      </Card>
    </AuthPageLayout>
  );
}
