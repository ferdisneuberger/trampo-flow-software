type EmailLayoutInput = {
  title: string;
  preheader: string;
  content: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderEmailLayout({
  title,
  preheader,
  content,
}: EmailLayoutInput): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;color:#101828;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e4e7ec;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;border-bottom:1px solid #e4e7ec;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:40px;height:40px;background-color:#274dc4;border-radius:12px;text-align:center;vertical-align:middle;color:#ffffff;font-size:20px;font-weight:700;">T</td>
                    <td style="padding-left:12px;font-size:18px;font-weight:700;color:#101828;">Trampo Flow</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #e4e7ec;font-size:12px;line-height:20px;color:#667085;">
                Este é um e-mail automático do Trampo Flow. Se precisar de ajuda, responda esta mensagem.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderButton(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:12px;background-color:#274dc4;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 24px;border-radius:12px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}
