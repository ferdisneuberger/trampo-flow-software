#!/usr/bin/env node
/**
 * Gera os arquivos do Grafana a partir das definições em `dashboard.mjs` e
 * `alerts.mjs`, sem dependências:
 *
 *   node infra/observability/build.mjs
 *       [--datasource-uid <uid>]   uid da fonte de dados Prometheus (alertas)
 *       [--contact-point <nome>]   ponto de contato de e-mail já existente
 *       [--email <endereço>]       gera também um ponto de contato novo
 *       [--check]                  só confere se os arquivos versionados estão em dia
 *
 * Saída em `infra/observability/grafana/`:
 *   trampo-flow-dashboard.json        importar em Dashboards -> Import
 *   trampo-flow-alert-rules.json      provisionamento das regras (ou apply-alert-rules.mjs)
 *   trampo-flow-contact-point.json    opcional (só com --email)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALERTS, buildRule } from './alerts.mjs';
import { buildDashboard } from './dashboard.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'grafana');
const FOLDER = 'Trampo Flow';
const GROUP = 'trampo-flow';

export function renderAll({
  datasourceUid = 'PROMETHEUS_DS_UID',
  contactPoint = 'trampo-flow-email',
  email,
} = {}) {
  const files = {
    'trampo-flow-dashboard.json': buildDashboard(),
    'trampo-flow-alert-rules.json': {
      apiVersion: 1,
      groups: [
        {
          orgId: 1,
          name: GROUP,
          folder: FOLDER,
          interval: '1m',
          rules: ALERTS.map((spec) =>
            buildRule(spec, { datasourceUid, contactPoint }),
          ),
        },
      ],
    },
  };

  if (email) {
    files['trampo-flow-contact-point.json'] = {
      apiVersion: 1,
      contactPoints: [
        {
          orgId: 1,
          name: contactPoint,
          receivers: [
            {
              uid: 'trampo-flow-email',
              type: 'email',
              settings: { addresses: email, singleEmail: false },
              disableResolveMessage: false,
            },
          ],
        },
      ],
    };
  }

  return Object.fromEntries(
    Object.entries(files).map(([name, content]) => [
      name,
      `${JSON.stringify(content, null, 2)}\n`,
    ]),
  );
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);

  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const files = renderAll({
    datasourceUid: arg('datasource-uid'),
    contactPoint: arg('contact-point'),
    email: arg('email'),
  });

  if (check) {
    const stale = Object.entries(files)
      .filter(([name]) => name !== 'trampo-flow-contact-point.json')
      .filter(([name, content]) => {
        try {
          return readFileSync(join(OUT, name), 'utf8') !== content;
        } catch {
          return true;
        }
      })
      .map(([name]) => name);

    if (stale.length > 0) {
      console.error(
        `Desatualizados: ${stale.join(', ')}. Rode: node infra/observability/build.mjs`,
      );
      process.exit(1);
    }

    console.log('Arquivos do Grafana em dia.');
  } else {
    mkdirSync(OUT, { recursive: true });

    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(OUT, name), content);
      console.log(`gerado: infra/observability/grafana/${name}`);
    }
  }
}
