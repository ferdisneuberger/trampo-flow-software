import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import {
  GoogleIdentityVerifier,
  type GoogleIdentity,
} from '../../domain/auth/services/google-identity-verifier';

@Injectable()
export class GoogleTokenVerifier extends GoogleIdentityVerifier {
  private readonly clientId: string | null;
  private readonly client = new OAuth2Client();

  constructor(configService: ConfigService) {
    super();

    this.clientId =
      configService.get<string>('GOOGLE_CLIENT_ID')?.trim() || null;
  }

  async verify(credential: string): Promise<GoogleIdentity> {
    if (!this.clientId) {
      throw new ServiceUnavailableException({
        message: 'Login com Google não configurado.',
        code: 'GOOGLE_NOT_CONFIGURED',
      });
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: this.clientId,
      });
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email) {
        throw new Error('Payload incompleto.');
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified === true,
      };
    } catch {
      throw new UnauthorizedException({
        message: 'Credencial do Google inválida.',
        code: 'INVALID_GOOGLE_TOKEN',
      });
    }
  }
}
