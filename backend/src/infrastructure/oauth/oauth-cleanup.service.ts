import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { OAuthClientRepository } from '../../domain/oauth/repositories/oauth-client.repository';
import { OAuthCodeRepository } from '../../domain/oauth/repositories/oauth-code.repository';
import { OAuthTokenRepository } from '../../domain/oauth/repositories/oauth-token.repository';
import {
  AppMetrics,
  NoopAppMetrics,
} from '../../application/shared/metrics/app-metrics';
import { OAuthSettings } from '../../application/oauth/services/oauth-settings';

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

/** Limpeza horária de códigos, tokens e clientes DCR sem uso (sem dependência nova). */
@Injectable()
export class OAuthCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OAuthCleanupService.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly settings: OAuthSettings,
    private readonly codes: OAuthCodeRepository,
    private readonly tokens: OAuthTokenRepository,
    private readonly clients: OAuthClientRepository,
    @Optional() private readonly metrics: AppMetrics = new NoopAppMetrics(),
  ) {}

  onModuleInit(): void {
    if (!this.settings.enabled) {
      return;
    }

    this.timer = setInterval(() => void this.runOnce(), HOUR_IN_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  async runOnce(now = new Date()): Promise<void> {
    try {
      const codes = await this.codes.deleteExpiredBefore(
        new Date(now.getTime() - HOUR_IN_MS),
      );
      const accessTokens = await this.tokens.deleteExpiredAccessTokens(now);
      const refreshTokens = await this.tokens.deleteStaleRefreshTokens(
        now,
        new Date(now.getTime() - 7 * DAY_IN_MS),
      );
      const clients = await this.clients.deleteUnusedDcr(
        new Date(now.getTime() - 30 * DAY_IN_MS),
      );

      this.metrics.oauthCleanup({
        codes,
        access_tokens: accessTokens,
        refresh_tokens: refreshTokens,
        clients,
      });
    } catch (error) {
      this.metrics.oauthCleanupFailed();
      this.logger.error(
        `Falha na limpeza do OAuth: ${error instanceof Error ? error.message : 'erro'}`,
      );
    }
  }
}
