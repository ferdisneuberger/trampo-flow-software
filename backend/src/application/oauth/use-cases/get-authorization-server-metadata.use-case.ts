import { Injectable } from '@nestjs/common';
import { OAUTH_SUPPORTED_SCOPES } from '../../../domain/oauth/scopes';
import { OAuthSettings } from '../services/oauth-settings';

/** Metadata do servidor de autorização (RFC 8414). O `issuer` não tem caminho. */
@Injectable()
export class GetAuthorizationServerMetadataUseCase {
  constructor(private readonly settings: OAuthSettings) {}

  execute(): Record<string, unknown> {
    return {
      issuer: this.settings.issuer,
      authorization_endpoint: this.settings.authorizationEndpoint,
      token_endpoint: this.settings.tokenEndpoint,
      registration_endpoint: this.settings.registrationEndpoint,
      revocation_endpoint: this.settings.revocationEndpoint,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: [...OAUTH_SUPPORTED_SCOPES],
      client_id_metadata_document_supported: true,
      authorization_response_iss_parameter_supported: true,
    };
  }
}
