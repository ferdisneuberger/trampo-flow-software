import { Readable } from 'node:stream';
import type { StorageService } from '../../src/infrastructure/storage/storage.service';

export class FakeStorageService {
  readonly objects = new Map<string, Buffer>();

  async putObject(key: string, body: Buffer): Promise<void> {
    this.objects.set(key, body);
  }

  async getObject(key: string): Promise<Readable> {
    const body = this.objects.get(key);

    if (!body) {
      throw new Error(`Object "${key}" not found.`);
    }

    return Readable.from(body);
  }

  async removeObject(key: string): Promise<void> {
    this.objects.delete(key);
  }

  asService(): StorageService {
    return this as unknown as StorageService;
  }
}
