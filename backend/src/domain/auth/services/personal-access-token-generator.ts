export const PERSONAL_ACCESS_TOKEN_PREFIX = 'tfp_';

export type GeneratedPersonalAccessToken = {
  /** Segredo em texto puro. Só é devolvido ao usuário na criação. */
  token: string;
  /** Início do token, seguro para exibir na listagem. */
  prefix: string;
};

export abstract class PersonalAccessTokenGenerator {
  abstract generate(): GeneratedPersonalAccessToken;
}

export function isPersonalAccessToken(value: string): boolean {
  return value.startsWith(PERSONAL_ACCESS_TOKEN_PREFIX);
}
