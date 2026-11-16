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
 * Marca do app (três barras decrescentes, alinhadas na base), desenhada com
 * tabela porque Gmail e Outlook descartam SVG. A opacidade do SVG vira cor
 * sólida já misturada com o fundo, pois `opacity` também não é confiável.
 */
function tableBar(cls: string, color: string, height: number): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td class="${cls}" width="5" height="${height}" bgcolor="${color}" style="width:5px;height:${height}px;background-color:${color};border-radius:1px;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

function renderBrandMark(): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" aria-hidden="true">
        <tr style="vertical-align:bottom;">
          <td valign="bottom">${tableBar('tf-bar1', '#1d1e21', 20)}</td>
          <td width="2" style="width:2px;font-size:0;line-height:0;">&nbsp;</td>
          <td valign="bottom">${tableBar('tf-bar2', '#616264', 14)}</td>
          <td width="2" style="width:2px;font-size:0;line-height:0;">&nbsp;</td>
          <td valign="bottom">${tableBar('tf-bar3', '#999a9b', 8)}</td>
        </tr>
      </table>`;
}

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
        .tf-body { background-color: #1d1e21 !important; }
        .tf-card { background-color: #25272b !important; border-color: #363940 !important; }
        .tf-header, .tf-footer, .tf-divider { border-color: #363940 !important; }
        .tf-heading, .tf-wordmark { color: #ecedef !important; }
        .tf-text { color: #c9cbd0 !important; }
        .tf-muted { color: #9a9ea6 !important; }
        .tf-card a { color: #ecedef !important; }
        .tf-code { background-color: #1d1e21 !important; border-color: #363940 !important; }
        .tf-code-text { color: #ecedef !important; }
        .tf-btn { background-color: #f2f3f5 !important; }
        .tf-btn a { color: #1d1e21 !important; }
        .tf-bar1 { background-color: #ecedef !important; }
        .tf-bar2 { background-color: #b0b2b4 !important; }
        .tf-bar3 { background-color: #7f8083 !important; }
      }

      [data-ogsc] .tf-body { background-color: #1d1e21 !important; }
      [data-ogsc] .tf-card { background-color: #25272b !important; border-color: #363940 !important; }
      [data-ogsc] .tf-heading, [data-ogsc] .tf-wordmark { color: #ecedef !important; }
      [data-ogsc] .tf-text { color: #c9cbd0 !important; }
      [data-ogsc] .tf-muted { color: #9a9ea6 !important; }
      [data-ogsc] .tf-code { background-color: #1d1e21 !important; border-color: #363940 !important; }
      [data-ogsc] .tf-code-text { color: #ecedef !important; }
      [data-ogsc] .tf-btn { background-color: #f2f3f5 !important; }
      [data-ogsc] .tf-btn a { color: #1d1e21 !important; }
      [data-ogsc] .tf-bar1 { background-color: #ecedef !important; }
      [data-ogsc] .tf-bar2 { background-color: #b0b2b4 !important; }
      [data-ogsc] .tf-bar3 { background-color: #7f8083 !important; }
    </style>
  </head>
  <body class="tf-body" style="margin:0;padding:0;background-color:#f4f4f5;color:#1d1e21;font-family:${fontSans};">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="tf-card" style="max-width:560px;background-color:#ffffff;border:1px solid #dcdde1;border-radius:12px;overflow:hidden;">
            <tr>
              <td class="tf-header" style="padding:22px 28px;border-bottom:1px solid #dcdde1;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      ${renderBrandMark()}
                    </td>
                    <td style="padding-left:10px;vertical-align:middle;">
                      <span class="tf-wordmark" style="font-family:${fontSans};font-size:17px;line-height:22px;font-weight:600;letter-spacing:-0.01em;color:#1d1e21;">trampo flow</span>
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
              <td class="tf-footer" style="padding:18px 28px;border-top:1px solid #dcdde1;">
                <p class="tf-muted" style="margin:0 0 4px;font-family:${fontSans};font-size:12px;line-height:18px;color:#5e626a;">
                  Trampo Flow · feito pra quem corre atrás
                </p>
                <p class="tf-muted" style="margin:0;font-family:${fontSans};font-size:12px;line-height:18px;color:#5e626a;">
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
      <td class="tf-btn" bgcolor="#1d1e21" style="background-color:#1d1e21;border-radius:8px;">
        <a href="${safeHref}" style="display:inline-block;padding:13px 24px;font-family:${fontSans};font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function renderCodeBlock(code: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="tf-code" style="margin:24px 0;background-color:#f4f4f5;border:1px solid #dcdde1;border-radius:8px;">
    <tr>
      <td style="padding:20px;text-align:center;">
        <span class="tf-muted" style="display:block;margin-bottom:8px;font-family:${fontSans};font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#5e626a;">Código de verificação</span>
        <span class="tf-code-text" style="display:block;font-family:${fontMono};font-size:30px;line-height:38px;font-weight:700;letter-spacing:0.18em;color:#1d1e21;">${escapeHtml(code)}</span>
      </td>
    </tr>
  </table>`;
}
