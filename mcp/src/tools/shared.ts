import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ApiError } from '../api-client.js';
import {
  APPLICATION_STATUSES,
  STATUS_HELP,
  STATUS_LABELS,
  type Application,
} from '../types.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const statusSchema = z
  .enum(APPLICATION_STATUSES)
  .describe(`Status da candidatura: ${STATUS_HELP}.`);

export const applicationIdSchema = z
  .string()
  .uuid()
  .describe('Id (UUID) da candidatura, como devolvido por list_applications.');

export function daysSince(isoDate: string, now: Date = new Date()): number {
  return Math.max(
    0,
    Math.floor((now.getTime() - new Date(isoDate).getTime()) / DAY_IN_MS),
  );
}

/** Versão enxuta para listas: o modelo não precisa de posição nem datas cruas. */
export function summarize(application: Application, now: Date = new Date()) {
  return {
    id: application.id,
    title: application.title,
    company: application.company,
    status: application.status,
    statusLabel: STATUS_LABELS[application.status],
    currentPhase: application.currentPhase,
    daysSinceUpdate: daysSince(application.updatedAt, now),
  };
}

export function detail(application: Application, now: Date = new Date()) {
  return {
    ...summarize(application, now),
    link: application.link,
    companyUrl: application.companyUrl,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

/** Compara links ignorando protocolo, www, barra final, fragmento e caixa do host. */
export function normalizeLink(link: string): string {
  try {
    const url = new URL(link.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const path = url.pathname.replace(/\/+$/, '');

    return `${host}${path}${url.search}`;
  } catch {
    return link.trim().toLowerCase().replace(/\/+$/, '');
  }
}

export function ok(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function fail(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

/** Converte qualquer erro em resultado de tool, para o modelo ler e se corrigir. */
export async function run(
  fn: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      return fail(error.message);
    }

    console.error(
      '[trampo-flow-mcp] erro inesperado:',
      error instanceof Error ? error.message : error,
    );

    return fail('Erro inesperado no servidor MCP do Trampo Flow.');
  }
}
