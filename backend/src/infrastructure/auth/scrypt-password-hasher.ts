import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../domain/users/services/password-hasher';
import { hashPassword, verifyPassword } from './scrypt';

@Injectable()
export class ScryptPasswordHasher extends PasswordHasher {
  hash(password: string): Promise<string> {
    return hashPassword(password);
  }

  verify(password: string, passwordHash: string): Promise<boolean> {
    return verifyPassword(password, passwordHash);
  }
}
