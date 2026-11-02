import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from './download';

describe('downloadBlob', () => {
  const createObjectURL = vi.fn(() => 'blob:url');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('dispara o download e revoga o object URL no próximo tick', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    downloadBlob(new Blob(['conteudo']), 'curriculo.pdf');

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:url');
  });
});
