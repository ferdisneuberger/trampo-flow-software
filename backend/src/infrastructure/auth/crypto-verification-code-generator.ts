import { randomInt } from 'node:crypto';
import { VerificationCodeGenerator } from '../../domain/auth/services/verification-code-generator';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const SEPARATOR_INDEX = 3;

export class CryptoVerificationCodeGenerator extends VerificationCodeGenerator {
  generate(): string {
    let code = '';

    for (let index = 0; index < CODE_LENGTH; index += 1) {
      code += ALPHABET[randomInt(ALPHABET.length)];
    }

    return `${code.slice(0, SEPARATOR_INDEX)}-${code.slice(SEPARATOR_INDEX)}`;
  }
}
