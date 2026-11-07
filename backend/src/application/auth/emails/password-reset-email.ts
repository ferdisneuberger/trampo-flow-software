import { escapeHtml, renderButton, renderEmailLayout } from './email-layout';

type PasswordResetEmailInput = {
  token: string;
  appBaseUrl: string;
  expiresInMinutes: number;
};

export function buildPasswordResetEmail({
  token,
  appBaseUrl,
  expiresInMinutes,
}: PasswordResetEmailInput) {
  const baseUrl = appBaseUrl.replace(/\/+$/, '');
  const link = `${baseUrl}/redefinir-senha#token=${encodeURIComponent(token)}`;
  const subject = 'Redefinir sua senha no Trampo Flow';
  const text = [
    'Recebemos um pedido para redefinir sua senha no Trampo Flow.',
    '',
    'Acesse o link abaixo para criar uma nova senha:',
    link,
    '',
    `O link expira em ${expiresInMinutes} minutos e só pode ser usado uma vez.`,
    '',
    'Se você não solicitou, ignore este e-mail. Sua senha continua a mesma.',
  ].join('\n');

  const content = `
    <h1 class="tf-heading" style="margin:0 0 12px;font-family:'Bricolage Grotesque',Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;font-weight:800;letter-spacing:-0.04em;color:#171512;">Redefinir sua senha</h1>
    <p class="tf-text" style="margin:0 0 8px;font-size:15px;line-height:24px;color:#3f3a31;">
      Recebemos um pedido para redefinir a senha da sua conta no Trampo Flow.
    </p>
    <p class="tf-text" style="margin:0 0 0;font-size:15px;line-height:24px;color:#3f3a31;">
      Clica no botão abaixo para criar uma nova senha. O link expira em ${expiresInMinutes} minutos e só pode ser usado uma vez.
    </p>
    ${renderButton('Criar nova senha', link)}
    <p class="tf-muted" style="margin:0;font-size:13px;line-height:20px;color:#6d6457;">
      Se o botão não funcionar, copie e cole este link no navegador:<br />
      <a href="${escapeHtml(link)}" style="color:#b42318;word-break:break-all;">${escapeHtml(link)}</a>
    </p>
    <p class="tf-muted" style="margin:24px 0 0;font-size:13px;line-height:20px;color:#6d6457;">
      Se você não solicitou, ignore este e-mail. Sua senha continua a mesma.
    </p>
  `;

  return {
    subject,
    text,
    html: renderEmailLayout({
      title: subject,
      preheader: 'Recebemos um pedido para redefinir sua senha.',
      content,
    }),
  };
}
