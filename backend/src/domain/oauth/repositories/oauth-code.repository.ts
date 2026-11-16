import type { OAuthCodeRecord } from '../records';

export abstract class OAuthCodeRepository {
  abstract create(code: OAuthCodeRecord): Promise<void>;

  abstract findByHash(codeHash: string): Promise<OAuthCodeRecord | null>;

  /**
   * Marca como usado **de forma atômica** (`WHERE used_at IS NULL`). Devolve
   * `false` se outra requisição já o usou: é o que barra a corrida de dois
   * `/token` com o mesmo código.
   */
  abstract markUsed(id: string, at: Date): Promise<boolean>;

  abstract deleteExpiredBefore(before: Date): Promise<number>;
}
