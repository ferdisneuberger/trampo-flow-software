import { renderButton, renderEmailLayout } from './email-layout';

type VerifiedEmailInput = {
  appBaseUrl: string;
};

export function buildVerifiedEmail({ appBaseUrl }: VerifiedEmailInput) {
  const baseUrl = appBaseUrl.replace(/\/+$/, '');
  const link = `${baseUrl}/candidaturas`;
  const subject = 'Seu e-mail foi verificado no Trampo Flow';
  const text = [
    'Seu e-mail foi verificado com sucesso.',
    '',
    'Agora você já pode criar candidaturas no Trampo Flow.',
    '',
    `Acesse: ${link}`,
  ].join('\n');

  const content = `
    <h1 class="tf-heading" style="margin:0 0 12px;font-size:24px;line-height:30px;font-weight:600;letter-spacing:-0.02em;color:#1d1e21;">E-mail verificado</h1>
    <p class="tf-text" style="margin:0 0 8px;font-size:15px;line-height:24px;color:#3b3e44;">
      Tudo certo! Seu e-mail foi confirmado e sua conta está pronta para usar.
    </p>
    <p class="tf-text" style="margin:0 0 0;font-size:15px;line-height:24px;color:#3b3e44;">
      A criação de candidaturas já está liberada. Bora organizar os próximos trampos?
    </p>
    ${renderButton('Ir para o quadro', link)}
    <p class="tf-muted" style="margin:0;font-size:13px;line-height:20px;color:#5e626a;">
      Se você não reconhece esta ação, entre em contato respondendo este e-mail.
    </p>
  `;

  return {
    subject,
    text,
    html: renderEmailLayout({
      title: subject,
      preheader: 'Seu e-mail foi confirmado no Trampo Flow.',
      content,
    }),
  };
}
