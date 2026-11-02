import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { Application } from '../../../domain/applications/entities/application.entity';
import { ApplicationFile } from '../../../domain/applications/entities/application-file.entity';
import { ApplicationRepository } from '../../../domain/applications/repositories/application.repository';
import { StorageService } from '../../../infrastructure/storage/storage.service';
import {
  buildStorageKey,
  extensionFromName,
} from '../../../infrastructure/storage/storage-key';
import { ApplicationAlreadyDeletedError } from '../errors/application-already-deleted.error';
import { ApplicationNotFoundError } from '../errors/application-not-found.error';
import { ApplicationError } from '../../shared/errors/application.error';
import { ConflictError } from '../../shared/errors/conflict.error';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES_PER_APPLICATION = 3;

export type UploadApplicationFileInput = {
  userId: string;
  applicationId: string;
  filename: string;
  buffer: Buffer;
};

function isValidText(buffer: Buffer): boolean {
  if (buffer.includes(0)) {
    return false;
  }

  const decoded = buffer.toString('utf8');

  return Buffer.from(decoded, 'utf8').equals(buffer);
}

function hasValidSignature(buffer: Buffer, extension: 'pdf' | 'txt'): boolean {
  if (extension === 'pdf') {
    return buffer.subarray(0, 5).toString('latin1') === '%PDF-';
  }

  return isValidText(buffer);
}

@Injectable()
export class UploadApplicationFileUseCase {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly storage: StorageService,
  ) {}

  async execute(input: UploadApplicationFileInput): Promise<Application> {
    const application = await this.applicationRepository.findById(
      input.applicationId,
      input.userId,
    );

    if (!application) {
      throw new ApplicationNotFoundError(input.applicationId);
    }

    if (application.isDeleted) {
      throw new ApplicationAlreadyDeletedError(input.applicationId);
    }

    if (application.files.length >= MAX_FILES_PER_APPLICATION) {
      throw new ConflictError(
        `Cada candidatura aceita no máximo ${MAX_FILES_PER_APPLICATION} arquivos.`,
        'FILE_LIMIT_REACHED',
      );
    }

    if (input.buffer.length === 0) {
      throw new ApplicationError('Arquivo vazio.', 'EMPTY_FILE');
    }

    if (input.buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new ApplicationError(
        'O arquivo deve ter no máximo 5 MB.',
        'FILE_TOO_LARGE',
      );
    }

    const extension = extensionFromName(input.filename);

    if (!extension) {
      throw new ApplicationError(
        'Envie apenas arquivos PDF ou TXT.',
        'INVALID_FILE_TYPE',
      );
    }

    if (!hasValidSignature(input.buffer, extension)) {
      throw new ApplicationError(
        'O conteúdo do arquivo não corresponde à extensão.',
        'INVALID_FILE_CONTENT',
      );
    }

    const mimeType = extension === 'pdf' ? 'application/pdf' : 'text/plain';
    const checksum = createHash('sha256').update(input.buffer).digest('hex');
    const storageKey = buildStorageKey(
      input.applicationId,
      randomUUID(),
      extension,
    );
    const file = ApplicationFile.create({
      name: input.filename,
      mimeType,
      sizeInBytes: input.buffer.length,
      storageKey,
      checksum,
    });

    await this.storage.putObject(storageKey, input.buffer, mimeType);

    application.addFiles([file]);

    try {
      await this.applicationRepository.update(application, input.userId);
    } catch (error) {
      await this.storage.removeObject(storageKey).catch(() => undefined);

      throw error;
    }

    return application;
  }
}
