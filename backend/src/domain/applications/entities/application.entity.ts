import { randomUUID } from 'node:crypto';
import { DomainError } from '../../shared/errors/domain.error';
import { normalizeRequiredText } from '../../shared/validation/text.validation';
import { normalizeHttpUrl } from '../../shared/validation/url.validation';
import {
  ApplicationStatus,
  isApplicationStatus,
} from '../enums/application-status.enum';
import {
  ApplicationFile,
  CreateApplicationFileInput,
} from './application-file.entity';

export const APPLICATION_TITLE_MAX_LENGTH = 120;
export const APPLICATION_LINK_MAX_LENGTH = 2048;
export const APPLICATION_COMPANY_MAX_LENGTH = 120;
export const APPLICATION_COMPANY_MIN_LENGTH = 2;
export const APPLICATION_COMPANY_URL_MAX_LENGTH = 2048;
export const APPLICATION_CURRENT_PHASE_MAX_LENGTH = 120;

export type ApplicationFileInput = CreateApplicationFileInput | ApplicationFile;

export type CreateApplicationProps = {
  title: string;
  link: string;
  company: string;
  companyUrl?: string | null;
  currentPhase: string;
  status?: ApplicationStatus;
  files?: ApplicationFileInput[];
};

export type UpdateApplicationProps = {
  title?: string;
  link?: string;
  company?: string;
  companyUrl?: string | null;
  currentPhase?: string;
  status?: ApplicationStatus;
};

type ApplicationProps = {
  title: string;
  link: string;
  company: string;
  companyUrl: string | null;
  position: number;
  status: ApplicationStatus;
  currentPhase: string;
  files: ApplicationFile[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type RestoreApplicationProps = ApplicationProps & {
  id: string;
};

export class Application {
  private constructor(
    private readonly _id: string,
    private props: ApplicationProps,
  ) {}

  static create(input: CreateApplicationProps): Application {
    const title = normalizeRequiredText(input.title, {
      field: 'Title',
      maxLength: APPLICATION_TITLE_MAX_LENGTH,
      requiredCode: 'TITLE_REQUIRED',
      tooLongCode: 'TITLE_TOO_LONG',
    });

    const link = normalizeHttpUrl(input.link, {
      field: 'Link',
      maxLength: APPLICATION_LINK_MAX_LENGTH,
      requiredCode: 'LINK_REQUIRED',
      tooLongCode: 'LINK_TOO_LONG',
      invalidCode: 'INVALID_LINK',
    });

    const company = normalizeCompany(input.company);

    const companyUrl = normalizeCompanyUrl(input.companyUrl);

    const currentPhase = normalizeRequiredText(input.currentPhase, {
      field: 'Current phase',
      maxLength: APPLICATION_CURRENT_PHASE_MAX_LENGTH,
      requiredCode: 'CURRENT_PHASE_REQUIRED',
      tooLongCode: 'CURRENT_PHASE_TOO_LONG',
    });

    const status = input.status ?? ApplicationStatus.PENDING;

    if (!isApplicationStatus(status)) {
      throw new DomainError(
        'Status must be PENDING, IN_PROGRESS, COMPLETED or REJECTED.',
        'INVALID_STATUS',
      );
    }

    const files = (input.files ?? []).map((file) =>
      file instanceof ApplicationFile ? file : ApplicationFile.create(file),
    );

    const now = new Date();

    return new Application(randomUUID(), {
      title,
      link,
      company,
      companyUrl,
      position: 0,
      status,
      currentPhase,
      files,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static restore(input: RestoreApplicationProps): Application {
    return new Application(input.id, {
      title: input.title,
      link: input.link,
      company: input.company,
      companyUrl: input.companyUrl,
      position: input.position,
      status: input.status,
      currentPhase: input.currentPhase,
      files: [...input.files],
      createdAt: new Date(input.createdAt),
      updatedAt: new Date(input.updatedAt),
      deletedAt: input.deletedAt ? new Date(input.deletedAt) : null,
    });
  }

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this.props.title;
  }

  get link(): string {
    return this.props.link;
  }

  get company(): string {
    return this.props.company;
  }

  get companyUrl(): string | null {
    return this.props.companyUrl;
  }

  get position(): number {
    return this.props.position;
  }

  get status(): ApplicationStatus {
    return this.props.status;
  }

  get currentPhase(): string {
    return this.props.currentPhase;
  }

  get files(): ApplicationFile[] {
    return [...this.props.files];
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt ? new Date(this.props.deletedAt) : null;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  updateDetails(input: UpdateApplicationProps): void {
    this.ensureNotDeleted();

    const hasChanges =
      input.title !== undefined ||
      input.link !== undefined ||
      input.company !== undefined ||
      input.companyUrl !== undefined ||
      input.currentPhase !== undefined ||
      input.status !== undefined;

    if (!hasChanges) {
      throw new DomainError(
        'At least one field must be provided to update the application.',
        'NO_FIELDS_TO_UPDATE',
      );
    }

    const title =
      input.title !== undefined
        ? normalizeRequiredText(input.title, {
            field: 'Title',
            maxLength: APPLICATION_TITLE_MAX_LENGTH,
            requiredCode: 'TITLE_REQUIRED',
            tooLongCode: 'TITLE_TOO_LONG',
          })
        : this.props.title;

    const link =
      input.link !== undefined
        ? normalizeHttpUrl(input.link, {
            field: 'Link',
            maxLength: APPLICATION_LINK_MAX_LENGTH,
            requiredCode: 'LINK_REQUIRED',
            tooLongCode: 'LINK_TOO_LONG',
            invalidCode: 'INVALID_LINK',
          })
        : this.props.link;

    const company =
      input.company !== undefined
        ? normalizeCompany(input.company)
        : this.props.company;

    const companyUrl =
      input.companyUrl !== undefined
        ? normalizeCompanyUrl(input.companyUrl)
        : this.props.companyUrl;

    const currentPhase =
      input.currentPhase !== undefined
        ? normalizeRequiredText(input.currentPhase, {
            field: 'Current phase',
            maxLength: APPLICATION_CURRENT_PHASE_MAX_LENGTH,
            requiredCode: 'CURRENT_PHASE_REQUIRED',
            tooLongCode: 'CURRENT_PHASE_TOO_LONG',
          })
        : this.props.currentPhase;

    const status = input.status ?? this.props.status;

    if (!isApplicationStatus(status)) {
      throw new DomainError(
        'Status must be PENDING, IN_PROGRESS, COMPLETED or REJECTED.',
        'INVALID_STATUS',
      );
    }

    this.props.title = title;
    this.props.link = link;
    this.props.company = company;
    this.props.companyUrl = companyUrl;
    this.props.currentPhase = currentPhase;
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  addFiles(inputs: ApplicationFileInput[]): void {
    this.ensureNotDeleted();

    if (!Array.isArray(inputs) || inputs.length === 0) {
      throw new DomainError(
        'At least one file must be provided.',
        'NO_FILES_PROVIDED',
      );
    }

    const files = inputs.map((file) =>
      file instanceof ApplicationFile ? file : ApplicationFile.create(file),
    );

    this.props.files.push(...files);
    this.props.updatedAt = new Date();
  }

  softDelete(): void {
    if (this.props.deletedAt) {
      throw new DomainError(
        `Application "${this._id}" is already deleted.`,
        'APPLICATION_ALREADY_DELETED',
      );
    }

    const now = new Date();

    this.props.deletedAt = now;
    this.props.updatedAt = now;
  }

  private ensureNotDeleted(): void {
    if (this.props.deletedAt) {
      throw new DomainError(
        `Application "${this._id}" is deleted and cannot be modified.`,
        'APPLICATION_DELETED',
      );
    }
  }
}

function normalizeCompany(value: unknown): string {
  const company = normalizeRequiredText(value, {
    field: 'Company',
    maxLength: APPLICATION_COMPANY_MAX_LENGTH,
    requiredCode: 'COMPANY_REQUIRED',
    tooLongCode: 'COMPANY_TOO_LONG',
  });

  if (company.length < APPLICATION_COMPANY_MIN_LENGTH) {
    throw new DomainError(
      `Company must have at least ${APPLICATION_COMPANY_MIN_LENGTH} characters.`,
      'COMPANY_TOO_SHORT',
    );
  }

  return company;
}

function normalizeCompanyUrl(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  return normalizeHttpUrl(value, {
    field: 'Company URL',
    maxLength: APPLICATION_COMPANY_URL_MAX_LENGTH,
    requiredCode: 'COMPANY_URL_REQUIRED',
    tooLongCode: 'COMPANY_URL_TOO_LONG',
    invalidCode: 'INVALID_COMPANY_URL',
  });
}
