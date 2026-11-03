import { randomBytes } from 'node:crypto';
import { PasswordResetTokenGenerator } from '../../domain/auth/services/password-reset-token-generator';

const TOKEN_BYTES = 32;

export class CryptoPasswordResetTokenGenerator extends PasswordResetTokenGenerator {
  generate(): string {
    return randomBytes(TOKEN_BYTES).toString('base64url');
  }
}
