import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { TrampoApiClient } from '../api-client.js';
import type { Application, JobPostingPreview } from '../types.js';
import {
  detail,
  fail,
  normalizeLink,
  ok,
  run,
  statusSchema,
} from './shared.js';

export const DEFAULT_PHASE = 'Candidatura enviada';

async function findByLink(
  client: TrampoApiClient,
  link: string,
  hints: string[],
): Promise<Application | null> {
  const target = normalizeLink(link);
  const searches = [
    ...new Set(hints.map((hint) => hint.trim().slice(0, 100)).filter(Boolean)),
  ];

  for (const search of searches) {
    const page = await client.listApplications({ search, limit: 100 });
    const match = page.items.find(
      (application) => normalizeLink(application.link) === target,
    );

    if (match) {
      return match;
    }
  }

  return null;
}

export function registerCreateApplication(
  server: McpServer,
  client: TrampoApiClient,
): void {
  server.registerTool(
    'create_application',
    {
      title: 'Cadastrar candidatura',
      description: [
        'Cadastra uma candidatura a partir do link da vaga.',
        'Título, empresa e site que não forem informados são lidos da página da vaga.',
        'Se a página não trouxer título ou empresa, a tool devolve erro pedindo esses campos: pergunte ao usuário, não invente.',
        'Se já existir uma candidatura com o mesmo link, devolve a existente com `alreadyExisted: true` em vez de duplicar.',
      ].join(' '),
      inputSchema: {
        link: z.string().url().max(2048).describe('URL da vaga.'),
        currentPhase: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .optional()
          .describe(`Fase atual no processo. Padrão: "${DEFAULT_PHASE}".`),
        title: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .optional()
          .describe('Título da vaga. Omita para ler da página.'),
        company: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .optional()
          .describe('Nome da empresa. Omita para ler da página.'),
        companyUrl: z
          .string()
          .url()
          .max(2048)
          .optional()
          .describe('Site da empresa. Omita para ler da página.'),
        status: statusSchema
          .optional()
          .describe('Status inicial. Padrão: PENDING (Aguardando).'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    (input) =>
      run(async () => {
        let preview: JobPostingPreview | null = null;

        if (!input.title || !input.company || !input.companyUrl) {
          preview = await client.previewJobPosting(input.link);
        }

        const title = input.title ?? preview?.title?.trim() ?? '';
        const company = input.company ?? preview?.company?.trim() ?? '';
        const companyUrl = input.companyUrl ?? preview?.companyUrl ?? undefined;
        const missing = [!title && 'title', !company && 'company'].filter(
          Boolean,
        );

        if (missing.length > 0) {
          return fail(
            `Não consegui ler ${missing.join(' e ')} da página da vaga (status do preview: ${preview?.status ?? 'n/a'}). ` +
              `Pergunte ao usuário e chame create_application de novo informando ${missing.join(' e ')}.`,
          );
        }

        const existing = await findByLink(client, input.link, [company, title]);

        if (existing) {
          return ok({ alreadyExisted: true, application: detail(existing) });
        }

        const created = await client.createApplication({
          title: title.slice(0, 120),
          company: company.slice(0, 120),
          link: input.link,
          companyUrl,
          currentPhase: input.currentPhase ?? DEFAULT_PHASE,
          status: input.status,
        });

        return ok({
          alreadyExisted: false,
          filledFromPage: {
            title: !input.title,
            company: !input.company,
            companyUrl: !input.companyUrl && Boolean(companyUrl),
          },
          application: detail(created),
        });
      }),
  );
}
