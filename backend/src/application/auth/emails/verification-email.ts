import { escapeHtml, renderButton, renderEmailLayout } from './email-layout';

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
  const safeCode = escapeHtml(code);
  const subject = 'Seu código de verificação do Trampo Flow';
  const text = [
    'Confirme seu e-mail no Trampo Flow.',
    '',
    `Seu código de verificação é: ${code}`,
    '',
    `Acesse ${link} e informe o código.`,
    `O código expira em ${expiresInHours} horas.`,
    '',
    'Se você não criou uma conta, ignore este e-mail.',
  ].join('\n');

  const content = `
    <h1 style="margin:0 0 12px;font-size:24px;line-height:32px;color:#101828;">Confirme seu e-mail</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#344054;">
      Use o código abaixo para confirmar seu cadastro no Trampo Flow.
    </p>
    <div style="margin:0 0 8px;padding:20px;border:1px solid #d9e6ff;border-radius:12px;background-color:#eef4ff;text-align:center;">
      <span style="display:block;margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#1f3d9e;">Código de verificação</span>
      <span style="display:block;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:32px;line-height:40px;font-weight:700;letter-spacing:0.18em;color:#1f3d9e;">${safeCode}</span>
    </div>
    <p style="margin:0 0 0;font-size:13px;line-height:20px;color:#667085;">
      O código expira em ${expiresInHours} horas.
    </p>
    ${renderButton('Confirmar e-mail', link)}
    <p style="margin:0;font-size:13px;line-height:20px;color:#667085;">
      Se o botão não funcionar, copie e cole este link no navegador:<br />
      <a href="${escapeHtml(link)}" style="color:#274dc4;word-break:break-all;">${escapeHtml(link)}</a>
    </p>
    <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#667085;">
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
