import {
  escapeHtml,
  renderButton,
  renderCodeBlock,
  renderEmailLayout,
} from './email-layout';

type VerificationEmailInput = {
  code: string;
  appBaseUrl: string;
  expiresInHours: number;
};

export function buildVerificationEmail({
  code,
  appBaseUrl,
  expiresInHours,
}: VerificationEmailInput) {
  const baseUrl = appBaseUrl.replace(/\/+$/, '');
  const link = `${baseUrl}/verificar-email#token=${encodeURIComponent(code)}`;
  const subject = 'Seu código de verificação do Trampo Flow';
  const text = [
    'Bora confirmar seu e-mail no Trampo Flow.',
    '',
    `Seu código de verificação é: ${code}`,
    '',
    `Acesse ${link} e informe o código.`,
    `O código expira em ${expiresInHours} horas.`,
    '',
    'Se você não criou uma conta, ignore este e-mail.',
  ].join('\n');

  const content = `
    <h1 class="tf-heading" style="margin:0 0 12px;font-family:'Bricolage Grotesque',Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;font-weight:800;letter-spacing:-0.04em;color:#171512;">Confirme seu e-mail</h1>
    <p class="tf-text" style="margin:0 0 8px;font-size:15px;line-height:24px;color:#3f3a31;">
      Falta pouco: use o código abaixo para confirmar seu cadastro no Trampo Flow.
    </p>
    ${renderCodeBlock(code)}
    <p class="tf-muted" style="margin:0;font-size:13px;line-height:20px;color:#6d6457;">
      O código expira em ${expiresInHours} horas.
    </p>
    ${renderButton('Confirmar e-mail', link)}
    <p class="tf-muted" style="margin:0;font-size:13px;line-height:20px;color:#6d6457;">
      Se o botão não funcionar, copie e cole este link no navegador:<br />
      <a href="${escapeHtml(link)}" style="color:#b42318;word-break:break-all;">${escapeHtml(link)}</a>
    </p>
    <p class="tf-muted" style="margin:24px 0 0;font-size:13px;line-height:20px;color:#6d6457;">
      Se você não criou uma conta, ignore este e-mail.
    </p>
  `;

  return {
    subject,
    text,
    html: renderEmailLayout({
      title: subject,
      preheader: `Seu código de verificação é ${code}`,
      content,
    }),
  };
}
