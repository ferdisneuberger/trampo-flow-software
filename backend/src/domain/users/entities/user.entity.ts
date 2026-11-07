import { randomUUID } from 'node:crypto';
import { DomainError } from '../../shared/errors/domain.error';
import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  ThemePreference,
} from '../enums/theme-preference.enum';

export const EMAIL_MAX_LENGTH = 254;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 120;
export const PERSON_NAME_MAX_LENGTH = 30;
export const PASSWORD_HASH_MAX_LENGTH = 255;
export const TERMS_VERSION_MAX_LENGTH = 20;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9._-]+$/;
const PASSWORD_HASH_PREFIX = 'scrypt$';

type UserProps = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  emailVerifiedAt: Date | null;
  verificationSentAt: Date | null;
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
  username: string | null;
  googleId: string | null;
  passwordHash: string | null;
  themePreference: ThemePreference;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserProps = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  passwordHash?: string | null;
  googleId?: string | null;
  emailVerifiedAt?: Date | null;
  termsAcceptedAt?: Date | null;
  termsVersion?: string | null;
  themePreference?: ThemePreference;
};

export type RestoreUserProps = Omit<UserProps, 'themePreference'> & {
  id: string;
  themePreference?: ThemePreference;
};

export type PersonNameField = 'firstName' | 'lastName';

export function normalizePersonName(
  value: string,
  field: PersonNameField,
): string {
  const name = value.trim().replace(/\s+/g, ' ');
  const label = field === 'firstName' ? 'O nome' : 'O último nome';
  const code = field === 'firstName' ? 'FIRST_NAME' : 'LAST_NAME';

  if (name.length === 0) {
    throw new DomainError(`${label} é obrigatório.`, `${code}_REQUIRED`);
  }

  if (name.length > PERSON_NAME_MAX_LENGTH) {
    throw new DomainError(
      `${label} deve ter no máximo ${PERSON_NAME_MAX_LENGTH} caracteres.`,
      `${code}_TOO_LONG`,
    );
  }

  return name;
}

export function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();

  if (email.length === 0) {
    throw new DomainError('O e-mail é obrigatório.', 'EMAIL_REQUIRED');
  }

  if (email.length > EMAIL_MAX_LENGTH) {
    throw new DomainError(
      `O e-mail deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres.`,
      'EMAIL_TOO_LONG',
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new DomainError('O e-mail informado é inválido.', 'EMAIL_INVALID');
  }

  return email;
}

export function normalizeUsername(value: string): string {
  const username = value.trim().toLowerCase();

  if (username.length < USERNAME_MIN_LENGTH) {
    throw new DomainError(
      `O usuário deve ter pelo menos ${USERNAME_MIN_LENGTH} caracteres.`,
      'USERNAME_TOO_SHORT',
    );
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    throw new DomainError(
      `O usuário deve ter no máximo ${USERNAME_MAX_LENGTH} caracteres.`,
      'USERNAME_TOO_LONG',
    );
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new DomainError(
      'O usuário aceita apenas letras, números, ponto, hífen e underline.',
      'USERNAME_INVALID',
    );
  }

  return username;
}

function assertPasswordHash(passwordHash: string | null | undefined): void {
  if (passwordHash === null || passwordHash === undefined) {
    return;
  }

  if (!passwordHash.startsWith(PASSWORD_HASH_PREFIX)) {
    throw new DomainError(
      'O hash de senha precisa estar no formato scrypt.',
      'INVALID_PASSWORD_HASH',
    );
  }

  if (passwordHash.length > PASSWORD_HASH_MAX_LENGTH) {
    throw new DomainError(
      `O hash de senha deve ter no máximo ${PASSWORD_HASH_MAX_LENGTH} caracteres.`,
      'PASSWORD_HASH_TOO_LONG',
    );
  }
}

function assertTermsVersion(termsVersion: string | null): void {
  if (termsVersion !== null && termsVersion.length > TERMS_VERSION_MAX_LENGTH) {
    throw new DomainError(
      `A versão dos termos deve ter no máximo ${TERMS_VERSION_MAX_LENGTH} caracteres.`,
      'TERMS_VERSION_TOO_LONG',
    );
  }
}

function normalizeThemePreference(
  value: ThemePreference | undefined,
): ThemePreference {
  if (value === undefined) {
    return DEFAULT_THEME_PREFERENCE;
  }

  if (!isThemePreference(value)) {
    throw new DomainError(
      'A preferência de tema deve ser light, dark ou system.',
      'INVALID_THEME_PREFERENCE',
    );
  }

  return value;
}

export class User {
  private constructor(
    private readonly _id: string,
    private props: UserProps,
  ) {}

  static create(input: CreateUserProps): User {
    assertPasswordHash(input.passwordHash);
    assertTermsVersion(input.termsVersion ?? null);

    const now = new Date();

    return new User(randomUUID(), {
      email: normalizeEmail(input.email),
      firstName:
        input.firstName !== null && input.firstName !== undefined
          ? normalizePersonName(input.firstName, 'firstName')
          : null,
      lastName:
        input.lastName !== null && input.lastName !== undefined
          ? normalizePersonName(input.lastName, 'lastName')
          : null,
      emailVerifiedAt: input.emailVerifiedAt
        ? new Date(input.emailVerifiedAt)
        : null,
      verificationSentAt: null,
      termsAcceptedAt: input.termsAcceptedAt
        ? new Date(input.termsAcceptedAt)
        : null,
      termsVersion: input.termsVersion ?? null,
      username: null,
      googleId: input.googleId ?? null,
      passwordHash: input.passwordHash ?? null,
      themePreference: normalizeThemePreference(input.themePreference),
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(input: RestoreUserProps): User {
    assertPasswordHash(input.passwordHash);
    assertTermsVersion(input.termsVersion);

    return new User(input.id, {
      email: input.email ? normalizeEmail(input.email) : null,
      firstName:
        input.firstName !== null
          ? normalizePersonName(input.firstName, 'firstName')
          : null,
      lastName:
        input.lastName !== null
          ? normalizePersonName(input.lastName, 'lastName')
          : null,
      emailVerifiedAt: input.emailVerifiedAt
        ? new Date(input.emailVerifiedAt)
        : null,
      verificationSentAt: input.verificationSentAt
        ? new Date(input.verificationSentAt)
        : null,
      termsAcceptedAt: input.termsAcceptedAt
        ? new Date(input.termsAcceptedAt)
        : null,
      termsVersion: input.termsVersion,
      username: input.username ? normalizeUsername(input.username) : null,
      googleId: input.googleId,
      passwordHash: input.passwordHash,
      themePreference: normalizeThemePreference(input.themePreference),
      lastLoginAt: input.lastLoginAt ? new Date(input.lastLoginAt) : null,
      createdAt: new Date(input.createdAt),
      updatedAt: new Date(input.updatedAt),
    });
  }

  get id(): string {
    return this._id;
  }

  get email(): string | null {
    return this.props.email;
  }

  get firstName(): string | null {
    return this.props.firstName;
  }

  get lastName(): string | null {
    return this.props.lastName;
  }

  get emailVerifiedAt(): Date | null {
    return this.props.emailVerifiedAt
      ? new Date(this.props.emailVerifiedAt)
      : null;
  }

  get isEmailVerified(): boolean {
    return this.props.emailVerifiedAt !== null;
  }

  get verificationSentAt(): Date | null {
    return this.props.verificationSentAt
      ? new Date(this.props.verificationSentAt)
      : null;
  }

  get termsAcceptedAt(): Date | null {
    return this.props.termsAcceptedAt
      ? new Date(this.props.termsAcceptedAt)
      : null;
  }

  get termsVersion(): string | null {
    return this.props.termsVersion;
  }

  get username(): string | null {
    return this.props.username;
  }

  get googleId(): string | null {
    return this.props.googleId;
  }

  get passwordHash(): string | null {
    return this.props.passwordHash;
  }

  get themePreference(): ThemePreference {
    return this.props.themePreference;
  }

  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt ? new Date(this.props.lastLoginAt) : null;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  changeThemePreference(themePreference: ThemePreference): void {
    this.props.themePreference = normalizeThemePreference(themePreference);
    this.props.updatedAt = new Date();
  }

  registerLogin(at: Date): void {
    if (!(at instanceof Date) || Number.isNaN(at.getTime())) {
      throw new DomainError(
        'A data de login precisa ser válida.',
        'INVALID_LOGIN_DATE',
      );
    }

    this.props.lastLoginAt = new Date(at);
    this.props.updatedAt = new Date(at);
  }

  markEmailVerified(at: Date): void {
    if (!(at instanceof Date) || Number.isNaN(at.getTime())) {
      throw new DomainError(
        'A data de verificação precisa ser válida.',
        'INVALID_VERIFICATION_DATE',
      );
    }

    this.props.emailVerifiedAt = new Date(at);
    this.props.updatedAt = new Date(at);
  }

  markVerificationSent(at: Date): void {
    if (!(at instanceof Date) || Number.isNaN(at.getTime())) {
      throw new DomainError(
        'A data de envio precisa ser válida.',
        'INVALID_VERIFICATION_SENT_DATE',
      );
    }

    this.props.verificationSentAt = new Date(at);
    this.props.updatedAt = new Date(at);
  }

  linkGoogleAccount(googleId: string, at: Date): void {
    const normalized = googleId.trim();

    if (normalized.length === 0) {
      throw new DomainError(
        'O identificador do Google é obrigatório.',
        'GOOGLE_ID_REQUIRED',
      );
    }

    if (this.props.googleId && this.props.googleId !== normalized) {
      throw new DomainError(
        'Esta conta já está vinculada a outro Google.',
        'GOOGLE_ACCOUNT_ALREADY_LINKED',
      );
    }

    if (!(at instanceof Date) || Number.isNaN(at.getTime())) {
      throw new DomainError(
        'A data de vínculo precisa ser válida.',
        'INVALID_GOOGLE_LINK_DATE',
      );
    }

    this.props.googleId = normalized;
    this.props.updatedAt = new Date(at);
  }

  changePassword(passwordHash: string, at: Date): void {
    assertPasswordHash(passwordHash);

    if (!(at instanceof Date) || Number.isNaN(at.getTime())) {
      throw new DomainError(
        'A data de alteração precisa ser válida.',
        'INVALID_PASSWORD_CHANGE_DATE',
      );
    }

    this.props.passwordHash = passwordHash;
    this.props.updatedAt = new Date(at);
  }
}
