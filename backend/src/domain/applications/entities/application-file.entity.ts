import { randomUUID } from 'node:crypto';
import { DomainError } from '../../shared/errors/domain.error';
import { normalizeRequiredText } from '../../shared/validation/text.validation';
import { normalizeHttpUrl } from '../../shared/validation/url.validation';

export const APPLICATION_FILE_NAME_MAX_LENGTH = 255;
export const APPLICATION_FILE_URL_MAX_LENGTH = 2048;
export const APPLICATION_FILE_MIME_TYPE_MAX_LENGTH = 100;

const MIME_TYPE_PATTERN =
  /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/;

type ApplicationFileProps = {
  name: string;
  url: string;
  mimeType: string;
  sizeInBytes: number;
  uploadedAt: Date;
};

export type CreateApplicationFileInput = {
  name: string;
  url: string;
  mimeType: string;
  sizeInBytes: number;
  uploadedAt?: Date;
};

export type RestoreApplicationFileInput = ApplicationFileProps & {
  id: string;
};

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

    const url = normalizeHttpUrl(input.url, {
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

    const uploadedAt = input.uploadedAt ?? new Date();

    if (!(uploadedAt instanceof Date) || Number.isNaN(uploadedAt.getTime())) {
      throw new DomainError(
        'Upload date must be a valid date.',
        'INVALID_UPLOADED_AT',
      );
    }

    return new ApplicationFile(randomUUID(), {
      name,
      url,
      mimeType,
      sizeInBytes: input.sizeInBytes,
      uploadedAt: new Date(uploadedAt),
    });
  }

  static restore(input: RestoreApplicationFileInput): ApplicationFile {
    return new ApplicationFile(input.id, {
      name: input.name,
      url: input.url,
      mimeType: input.mimeType,
      sizeInBytes: input.sizeInBytes,
      uploadedAt: new Date(input.uploadedAt),
    });
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this.props.name;
  }

  get url(): string {
    return this.props.url;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get sizeInBytes(): number {
    return this.props.sizeInBytes;
  }

  get uploadedAt(): Date {
    return new Date(this.props.uploadedAt);
  }
}
