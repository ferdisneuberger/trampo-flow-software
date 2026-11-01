import type { ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ConflictError } from '../../src/application/shared/errors/conflict.error';
import { NotFoundError } from '../../src/application/shared/errors/not-found.error';
import { DomainError } from '../../src/domain/shared/errors/domain.error';
import { DomainExceptionFilter } from '../../src/infrastructure/http/filters/domain-exception.filter';

function createHost(): {
  host: ArgumentsHost;
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
} {
  const status = vi.fn();
  const send = vi.fn();
  const reply = { status, send };

  status.mockReturnValue(reply);

  const host = {
    switchToHttp: () => ({ getResponse: () => reply }),
  } as unknown as ArgumentsHost;

  return { host, status, send };
}

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();

  it('mapeia erro de domínio para 400 mantendo o código', () => {
    const { host, status, send } = createHost();

    filter.catch(new DomainError('Título inválido.', 'TITLE_REQUIRED'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith({
      error: 'TITLE_REQUIRED',
      message: 'Título inválido.',
    });
  });

  it('mapeia NotFoundError para 404', () => {
    const { host, status, send } = createHost();

    filter.catch(
      new NotFoundError('Candidatura não encontrada.', 'APPLICATION_NOT_FOUND'),
      host,
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledWith({
      error: 'APPLICATION_NOT_FOUND',
      message: 'Candidatura não encontrada.',
    });
  });

  it('mapeia ConflictError para 409', () => {
    const { host, status } = createHost();

    filter.catch(new ConflictError('Já existe.', 'ALREADY_EXISTS'), host);

    expect(status).toHaveBeenCalledWith(409);
  });
});
