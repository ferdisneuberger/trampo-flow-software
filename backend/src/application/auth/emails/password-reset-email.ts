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
    <h1 style="margin:0 0 12px;font-size:24px;line-height:32px;color:#101828;">Redefinir sua senha</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:24px;color:#344054;">
      Recebemos um pedido para redefinir a senha da sua conta no Trampo Flow.
    </p>
    <p style="margin:0 0 0;font-size:15px;line-height:24px;color:#344054;">
      Clique no botão abaixo para criar uma nova senha. O link expira em ${expiresInMinutes} minutos.
    </p>
    ${renderButton('Criar nova senha', link)}
    <p style="margin:0;font-size:13px;line-height:20px;color:#667085;">
      Se o botão não funcionar, copie e cole este link no navegador:<br />
      <a href="${escapeHtml(link)}" style="color:#274dc4;word-break:break-all;">${escapeHtml(link)}</a>
    </p>
    <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#667085;">
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
