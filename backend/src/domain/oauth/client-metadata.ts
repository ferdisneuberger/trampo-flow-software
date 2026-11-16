import { isAllowedRedirectUri } from './redirect-uri-policy';

export const CLIENT_NAME_MAX_LENGTH = 120;
export const MAX_REDIRECT_URIS = 5;

/** Concessões que este servidor realmente atende. */
export const SUPPORTED_GRANT_TYPES = ['authorization_code', 'refresh_token'];

export type ClientMetadata = {
  name: string;
  redirectUris: string[];
  /** Só as concessões suportadas que o cliente declarou (padrão: as duas). */
  grantTypes: string[];
};

export type ClientMetadataError =
  'invalid_client_metadata' | 'invalid_redirect_uri';

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

export function isValidClientName(name: unknown): name is string {
  return (
    typeof name === 'string' &&
    name.trim().length > 0 &&
    name.length <= CLIENT_NAME_MAX_LENGTH &&
    !CONTROL_CHARACTERS.test(name)
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

/**
 * Validação comum aos metadados de DCR (RFC 7591) e de CIMD: só cliente
 * público, nome legível e `redirect_uris` dentro da allowlist. Campos extras
 * são ignorados.
 */
export function validateClientMetadata(
  input: Record<string, unknown>,
  extraAllowedRedirects: readonly string[],
):
  | { ok: true; value: ClientMetadata }
  | { ok: false; error: ClientMetadataError; description: string } {
  if (!isValidClientName(input.client_name)) {
    return {
      ok: false,
      error: 'invalid_client_metadata',
      description: `client_name é obrigatório, com até ${CLIENT_NAME_MAX_LENGTH} caracteres e sem caracteres de controle.`,
    };
  }

  const method = input.token_endpoint_auth_method;

  if (method !== undefined && method !== 'none') {
    return {
      ok: false,
      error: 'invalid_client_metadata',
      description: 'Só clientes públicos (token_endpoint_auth_method "none").',
    };
  }

  // RFC 7591 §2: o servidor pode ignorar o que não suporta. O Claude declara
  // tipos além dos nossos, então os extras são descartados (o /token já recusa
  // qualquer concessão que não seja uma das duas) e o que falta é só exigir
  // `authorization_code` e `code`, sem os quais o cliente não funciona aqui.
  const grantTypes = input.grant_types;
  let acceptedGrantTypes = [...SUPPORTED_GRANT_TYPES];

  if (grantTypes !== undefined) {
    if (!isStringArray(grantTypes)) {
      return {
        ok: false,
        error: 'invalid_client_metadata',
        description: 'grant_types deve ser uma lista de textos.',
      };
    }

    acceptedGrantTypes = SUPPORTED_GRANT_TYPES.filter((grant) =>
      grantTypes.includes(grant),
    );

    if (!acceptedGrantTypes.includes('authorization_code')) {
      return {
        ok: false,
        error: 'invalid_client_metadata',
        description: 'grant_types deve incluir authorization_code.',
      };
    }
  }

  const responseTypes = input.response_types;

  if (responseTypes !== undefined) {
    if (!isStringArray(responseTypes) || !responseTypes.includes('code')) {
      return {
        ok: false,
        error: 'invalid_client_metadata',
        description: 'response_types deve incluir "code".',
      };
    }
  }

  const redirectUris = input.redirect_uris;

  if (
    !isStringArray(redirectUris) ||
    redirectUris.length < 1 ||
    redirectUris.length > MAX_REDIRECT_URIS
  ) {
    return {
      ok: false,
      error: 'invalid_redirect_uri',
      description: `redirect_uris deve ter de 1 a ${MAX_REDIRECT_URIS} itens.`,
    };
  }

  if (
    redirectUris.some(
      (uri) => !isAllowedRedirectUri(uri, extraAllowedRedirects),
    )
  ) {
    return {
      ok: false,
      error: 'invalid_redirect_uri',
      description: 'redirect_uri não permitido para este servidor.',
    };
  }

  return {
    ok: true,
    value: {
      name: input.client_name.trim(),
      redirectUris: [...new Set(redirectUris)],
      grantTypes: acceptedGrantTypes,
    },
  };
}
