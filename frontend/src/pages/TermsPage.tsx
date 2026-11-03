import { Link } from 'react-router-dom';
import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { Card } from '../components/ui/Card';

export function TermsPage() {
  return (
    <AuthPageLayout
      tagline="Termos de uso"
      width="lg"
      footer={
        <Link
          to="/cadastro"
          className="font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          Voltar para o cadastro
        </Link>
      }
    >
      <Card className="space-y-6 p-6 text-sm leading-6 text-ink-700 sm:p-8">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink-900">
            Termos de uso do Trampo Flow
          </h2>
          <p className="mt-2 text-xs text-ink-500">Versão 2026-11</p>
        </div>

        <section>
          <h3 className="font-semibold text-ink-900">1. Aceitação</h3>
          <p className="mt-1">
            Ao criar uma conta, você concorda com estes termos e com o uso da
            plataforma para acompanhar suas candidaturas de emprego.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-ink-900">2. Conta e segurança</h3>
          <p className="mt-1">
            Você é responsável por manter a confidencialidade da sua senha e
            pelas atividades realizadas na sua conta. Informe imediatamente se
            suspeitar de acesso não autorizado.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-ink-900">3. Uso adequado</h3>
          <p className="mt-1">
            A plataforma deve ser usada apenas para fins pessoais e legítimos.
            Não é permitido tentar acessar contas de outras pessoas, interferir
            no funcionamento do serviço ou automatizar acessos de forma abusiva.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-ink-900">4. Conteúdo e dados</h3>
          <p className="mt-1">
            As informações cadastradas são de sua responsabilidade. Usamos os
            dados para operar a conta, enviar e-mails de verificação e
            recuperação de senha e manter a segurança do serviço.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-ink-900">5. E-mails</h3>
          <p className="mt-1">
            Podemos enviar mensagens transacionais relacionadas ao cadastro,
            verificação de e-mail e recuperação de senha. Esses e-mails não têm
            finalidade de marketing.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-ink-900">
            6. Disponibilidade e limitações
          </h3>
          <p className="mt-1">
            O serviço pode passar por manutenções e não garante disponibilidade
            ininterrupta. Não nos responsabilizamos por decisões tomadas com
            base nas informações organizadas na plataforma.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-ink-900">7. Encerramento</h3>
          <p className="mt-1">
            Podemos suspender contas que violem estes termos ou comprometam a
            segurança do serviço.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-ink-900">8. Contato</h3>
          <p className="mt-1">
            Em caso de dúvidas sobre estes termos, responda ao e-mail de contato
            recebido do Trampo Flow.
          </p>
        </section>
      </Card>
    </AuthPageLayout>
  );
}
