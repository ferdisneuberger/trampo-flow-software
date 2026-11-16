#!/usr/bin/env node
/**
 * Aplica as regras de alerta no Grafana pela API, sem precisar montar arquivos
 * no container. Idempotente: substitui o grupo `trampo-flow` inteiro.
 *
 *   GRAFANA_URL=https://grafana.exemplo.com GRAFANA_TOKEN=<service account token> \
 *   node infra/observability/build.mjs --datasource-uid <uid> --contact-point "<nome>" \
 *   && node infra/observability/apply-alert-rules.mjs
 *
 * O token precisa do papel Editor (ou permissões de alertas e pastas). As regras
 * ficam editáveis pela interface (cabeçalho `X-Disable-Provenance`).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { GRAFANA_URL, GRAFANA_TOKEN } = process.env;

if (!GRAFANA_URL || !GRAFANA_TOKEN) {
  console.error('Defina GRAFANA_URL e GRAFANA_TOKEN.');
  process.exit(2);
}

const base = GRAFANA_URL.replace(/\/+$/, '');
const file = join(
  dirname(fileURLToPath(import.meta.url)),
  'grafana',
  'trampo-flow-alert-rules.json',
);
const provisioning = JSON.parse(readFileSync(file, 'utf8'));
const [group] = provisioning.groups;

async function api(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GRAFANA_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Disable-Provenance': 'true',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `${method} ${path} -> ${response.status}: ${text.slice(0, 400)}`,
    );
  }

  return text ? JSON.parse(text) : null;
}

const folders = await api('GET', `/api/folders?limit=1000`);
const folder =
  folders.find((item) => item.title === group.folder) ??
  (await api('POST', '/api/folders', { title: group.folder }));

const seconds = { m: 60, h: 3600, s: 1 };
const [, amount, unit] = /^(\d+)([smh])$/.exec(group.interval) ?? [];

await api(
  'PUT',
  `/api/v1/provisioning/folder/${folder.uid}/rule-groups/${group.name}`,
  {
    title: group.name,
    interval: Number(amount) * seconds[unit],
    rules: group.rules.map((rule) => ({
      ...rule,
      folderUID: folder.uid,
      ruleGroup: group.name,
      orgID: group.orgId,
    })),
  },
);

console.log(
  `Aplicadas ${group.rules.length} regras na pasta "${group.folder}" (grupo ${group.name}).`,
);
