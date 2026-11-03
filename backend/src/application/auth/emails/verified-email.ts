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
    <h1 style="margin:0 0 12px;font-size:24px;line-height:32px;color:#101828;">E-mail verificado</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:24px;color:#344054;">
      Tudo certo! Seu e-mail foi confirmado e sua conta está pronta para usar.
    </p>
    <p style="margin:0 0 0;font-size:15px;line-height:24px;color:#344054;">
      A criação de candidaturas já está liberada.
    </p>
    ${renderButton('Ir para o quadro', link)}
    <p style="margin:0;font-size:13px;line-height:20px;color:#667085;">
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
