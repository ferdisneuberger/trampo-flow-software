import { z } from 'zod';

const DEFAULT_TIMEOUT_MS = 15_000;

const configSchema = z.object({
  TRAMPO_API_URL: z
    .string({ error: 'TRAMPO_API_URL é obrigatória.' })
    .trim()
    .url(
      'TRAMPO_API_URL deve ser uma URL, por exemplo https://trampo-flow.neubergerdev.com.br/api.',
    )
    .refine(
      (value) => /^https?:\/\//i.test(value),
      'TRAMPO_API_URL deve usar http ou https.',
    ),
  TRAMPO_API_TOKEN: z
    .string({ error: 'TRAMPO_API_TOKEN é obrigatório.' })
    .trim()
    .startsWith(
      'tfp_',
      'TRAMPO_API_TOKEN deve ser um token de integração (tfp_...). Gere um em Configurações → MCP → Tokens de integração.',
    ),
  TRAMPO_API_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(120_000)
    .optional(),
});

export type Config = {
  apiUrl: string;
  token: string;
  timeoutMs: number;
};

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = configSchema.safeParse(env);

  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => `- ${issue.message}`);

    throw new ConfigError(
      `Configuração inválida do trampo-flow-mcp:\n${messages.join('\n')}`,
    );
  }

  return {
    apiUrl: parsed.data.TRAMPO_API_URL.replace(/\/+$/, ''),
    token: parsed.data.TRAMPO_API_TOKEN,
    timeoutMs: parsed.data.TRAMPO_API_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS,
  };
}
