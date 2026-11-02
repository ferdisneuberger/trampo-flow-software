import { randomUUID } from 'node:crypto';
import { DomainError } from '../../shared/errors/domain.error';
import { normalizeRequiredText } from '../../shared/validation/text.validation';
import { normalizeHttpUrl } from '../../shared/validation/url.validation';

export const APPLICATION_FILE_NAME_MAX_LENGTH = 255;
export const APPLICATION_FILE_URL_MAX_LENGTH = 2048;
export const APPLICATION_FILE_MIME_TYPE_MAX_LENGTH = 100;
export const APPLICATION_FILE_STORAGE_KEY_MAX_LENGTH = 512;
export const APPLICATION_FILE_CHECKSUM_MAX_LENGTH = 64;

const MIME_TYPE_PATTERN =
  /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/;

type ApplicationFileProps = {
  name: string;
  storageKey: string | null;
  legacyUrl: string | null;
  mimeType: string;
  sizeInBytes: number;
  checksum: string | null;
  uploadedAt: Date;
};

export type CreateApplicationFileInput = {
  name: string;
  mimeType: string;
  sizeInBytes: number;
  url?: string;
  storageKey?: string;
  checksum?: string;
  uploadedAt?: Date;
};

export type RestoreApplicationFileInput = ApplicationFileProps & {
  id: string;
};

function normalizeStorageKey(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const key = value.trim();

  if (key.length === 0) {
    return null;
  }

  if (key.length > APPLICATION_FILE_STORAGE_KEY_MAX_LENGTH) {
    throw new DomainError(
      `Storage key must be at most ${APPLICATION_FILE_STORAGE_KEY_MAX_LENGTH} characters long.`,
      'STORAGE_KEY_TOO_LONG',
    );
  }

  if (key.includes('..') || key.startsWith('/')) {
    throw new DomainError(
      'Storage key must be a relative path without traversal.',
      'INVALID_STORAGE_KEY',
    );
  }

  return key;
}

export class ApplicationFile {
  private constructor(
    private readonly _id: string,
    private readonly props: ApplicationFileProps,
  ) {}

  static create(input: CreateApplicationFileInput): ApplicationFile {
    const name = normalizeRequiredText(input.name, {
      field: 'File name',
      maxLength: APPLICATION_FILE_NAME_MAX_LENGTH,
      requiredCode: 'FILE_NAME_REQUIRED',
      tooLongCode: 'FILE_NAME_TOO_LONG',
    });

    const storageKey = normalizeStorageKey(input.storageKey);
    const legacyUrl = storageKey
      ? null
      : normalizeHttpUrl(input.url, {
          field: 'File URL',
          maxLength: APPLICATION_FILE_URL_MAX_LENGTH,
          requiredCode: 'FILE_URL_REQUIRED',
          tooLongCode: 'FILE_URL_TOO_LONG',
          invalidCode: 'INVALID_FILE_URL',
        });

    const mimeType = normalizeRequiredText(input.mimeType, {
      field: 'MIME type',
      maxLength: APPLICATION_FILE_MIME_TYPE_MAX_LENGTH,
      requiredCode: 'MIME_TYPE_REQUIRED',
      tooLongCode: 'MIME_TYPE_TOO_LONG',
    }).toLowerCase();

    if (!MIME_TYPE_PATTERN.test(mimeType)) {
      throw new DomainError(
        'MIME type must follow the "type/subtype" format.',
        'INVALID_MIME_TYPE',
      );
    }

    if (
      typeof input.sizeInBytes !== 'number' ||
      !Number.isInteger(input.sizeInBytes) ||
      input.sizeInBytes <= 0
    ) {
      throw new DomainError(
        'File size must be a positive integer.',
        'INVALID_FILE_SIZE',
      );
    }

    const checksum = input.checksum?.trim() ?? '';

    if (checksum.length > APPLICATION_FILE_CHECKSUM_MAX_LENGTH) {
      throw new DomainError(
        `Checksum must be at most ${APPLICATION_FILE_CHECKSUM_MAX_LENGTH} characters long.`,
        'CHECKSUM_TOO_LONG',
      );
    }

    const uploadedAt = input.uploadedAt ?? new Date();

    if (!(uploadedAt instanceof Date) || Number.isNaN(uploadedAt.getTime())) {
      throw new DomainError(
        'Upload date must be a valid date.',
        'INVALID_UPLOADED_AT',
      );
    }

    return new ApplicationFile(randomUUID(), {
      name,
      storageKey,
      legacyUrl,
      mimeType,
      sizeInBytes: input.sizeInBytes,
      checksum: checksum.length > 0 ? checksum : null,
      uploadedAt: new Date(uploadedAt),
    });
  }

  static restore(input: RestoreApplicationFileInput): ApplicationFile {
    return new ApplicationFile(input.id, {
      name: input.name,
      storageKey: input.storageKey,
      legacyUrl: input.legacyUrl,
      mimeType: input.mimeType,
      sizeInBytes: input.sizeInBytes,
      checksum: input.checksum,
      uploadedAt: new Date(input.uploadedAt),
    });
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this.props.name;
  }

  get storageKey(): string | null {
    return this.props.storageKey;
  }

  get legacyUrl(): string | null {
    return this.props.legacyUrl;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get sizeInBytes(): number {
    return this.props.sizeInBytes;
  }

  get checksum(): string | null {
    return this.props.checksum;
  }

  get uploadedAt(): Date {
    return new Date(this.props.uploadedAt);
  }
}
