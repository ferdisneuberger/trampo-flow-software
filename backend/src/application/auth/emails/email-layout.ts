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

const fontSans =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const fontMono =
  "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,'Courier New',monospace";

/**
 * Layout compartilhado dos e-mails transacionais. Usa tabelas e CSS inline
 * porque clientes de e-mail ignoram folhas externas; o bloco `<style>` só
 * cobre o modo escuro e pequenos ajustes que não podem ser inline.
 */
export function renderEmailLayout({
  title,
  preheader,
  content,
}: EmailLayoutInput): string {
  return `<!doctype html>
<html lang="pt-BR" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light dark; }
      body { margin: 0; padding: 0; }
      table { border-collapse: collapse; }
      img { border: 0; outline: none; text-decoration: none; }
      a { text-decoration: none; }

      @media (prefers-color-scheme: dark) {
        .tf-body { background-color: #12100e !important; }
        .tf-card { background-color: #1c1916 !important; border-color: #4a4238 !important; }
        .tf-header { border-color: #4a4238 !important; }
        .tf-footer { border-color: #4a4238 !important; }
        .tf-heading { color: #f7f1e5 !important; }
        .tf-text { color: #d8cdbb !important; }
        .tf-muted { color: #b0a38f !important; }
        .tf-code { background-color: #3a2f12 !important; border-color: #4a4238 !important; }
        .tf-code-text { color: #f7f1e5 !important; }
        .tf-tile { background-color: #f7f1e5 !important; }
        .tf-tile-text { color: #171512 !important; }
        .tf-wordmark { color: #f7f1e5 !important; }
        .tf-brand-accent { color: #ff9a85 !important; }
        .tf-divider { border-color: #4a4238 !important; }
      }

      [data-ogsc] .tf-body { background-color: #12100e !important; }
      [data-ogsc] .tf-card { background-color: #1c1916 !important; border-color: #4a4238 !important; }
      [data-ogsc] .tf-heading { color: #f7f1e5 !important; }
      [data-ogsc] .tf-text { color: #d8cdbb !important; }
      [data-ogsc] .tf-muted { color: #b0a38f !important; }
      [data-ogsc] .tf-code { background-color: #3a2f12 !important; border-color: #4a4238 !important; }
      [data-ogsc] .tf-code-text { color: #f7f1e5 !important; }
      [data-ogsc] .tf-tile { background-color: #f7f1e5 !important; }
      [data-ogsc] .tf-tile-text { color: #171512 !important; }
      [data-ogsc] .tf-wordmark { color: #f7f1e5 !important; }
      [data-ogsc] .tf-brand-accent { color: #ff9a85 !important; }
    </style>
  </head>
  <body class="tf-body" style="margin:0;padding:0;background-color:#f2e8d5;color:#171512;font-family:${fontSans};">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f2e8d5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="tf-card" style="max-width:600px;background-color:#fffaf0;border:2px solid #171512;border-radius:18px;overflow:hidden;">
            <tr>
              <td class="tf-header" style="padding:24px 28px;border-bottom:2px solid #171512;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="44" height="44" class="tf-tile" bgcolor="#171512" style="width:44px;height:44px;background-color:#171512;border-radius:12px;text-align:center;vertical-align:middle;">
                      <span class="tf-tile-text" style="display:block;font-family:${fontSans};font-size:26px;line-height:44px;font-weight:800;color:#f7c948;">T</span>
                    </td>
                    <td style="padding-left:12px;vertical-align:middle;">
                      <span class="tf-wordmark" style="font-family:${fontSans};font-size:20px;line-height:24px;font-weight:800;letter-spacing:-0.03em;color:#171512;">trampo <span class="tf-brand-accent" style="color:#b42318;">flow</span></span>
                      <br />
                      <span class="tf-muted" style="font-family:${fontMono};font-size:9px;line-height:16px;letter-spacing:0.12em;text-transform:uppercase;color:#6d6457;">feito pra quem corre atrás</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td class="tf-footer" style="padding:20px 28px;border-top:2px dashed #d8cbb5;">
                <p class="tf-muted" style="margin:0 0 6px;font-family:${fontMono};font-size:9px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:#6d6457;">
                  Trampo Flow · feito pra quem corre atrás
                </p>
                <p class="tf-muted" style="margin:0;font-family:${fontSans};font-size:12px;line-height:20px;color:#6d6457;">
                  Este é um e-mail automático. Se precisar de ajuda, responda esta mensagem.
                </p>
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
  const safeHref = escapeHtml(href);

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
    <tr>
      <td bgcolor="#ff5a3c" style="background-color:#ff5a3c;border:2px solid #171512;border-radius:10px;">
        <a href="${safeHref}" style="display:inline-block;padding:14px 24px;font-family:${fontSans};font-size:15px;line-height:20px;font-weight:700;color:#171512;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function renderCodeBlock(code: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="tf-code" style="margin:24px 0;background-color:#fbe7a6;border:2px solid #171512;border-radius:12px;">
    <tr>
      <td style="padding:20px;text-align:center;">
        <span class="tf-muted" style="display:block;margin-bottom:8px;font-family:${fontMono};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#3f3a31;">Código de verificação</span>
        <span class="tf-code-text" style="display:block;font-family:${fontMono};font-size:30px;line-height:38px;font-weight:700;letter-spacing:0.18em;color:#171512;">${escapeHtml(code)}</span>
      </td>
    </tr>
  </table>`;
}
