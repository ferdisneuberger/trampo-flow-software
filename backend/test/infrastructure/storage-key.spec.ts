import { describe, expect, it } from 'vitest';
import {
  buildStorageKey,
  extensionFromName,
} from '../../src/infrastructure/storage/storage-key';

describe('extensionFromName', () => {
  it('aceita pdf e txt', () => {
    expect(extensionFromName('curriculo.pdf')).toBe('pdf');
    expect(extensionFromName('carta.TXT')).toBe('txt');
  });

  it('recusa outras extensões', () => {
    expect(extensionFromName('video.mp4')).toBeNull();
    expect(extensionFromName('foto.png')).toBeNull();
  });

  it('recusa nome sem extensão', () => {
    expect(extensionFromName('curriculo')).toBeNull();
  });
});

describe('buildStorageKey', () => {
  it('monta a chave com aplicação, arquivo e extensão', () => {
    expect(
      buildStorageKey(
        '6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10',
        'b1e2d3c4-5f60-4a7b-8c9d-0e1f2a3b4c5d',
        'pdf',
      ),
    ).toBe(
      'applications/6d0f3f7e-6f1f-4c1e-9a0e-2b6a4f5c8d10/b1e2d3c4-5f60-4a7b-8c9d-0e1f2a3b4c5d.pdf',
    );
  });

  it('não usa o nome enviado pelo cliente', () => {
    const key = buildStorageKey('app', 'file', 'txt');

    expect(key).not.toContain('..');
    expect(key.startsWith('applications/')).toBe(true);
  });
});
