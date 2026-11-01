import {
  ApplicationCursor,
  ApplicationSort,
} from '../../../domain/applications/repositories/application.repository';
import { ApplicationError } from '../../shared/errors/application.error';

export type ApplicationCursorPayload = {
  s: string;
  v: string;
  i: string;
};

export function encodeCursor(cursor: ApplicationCursor): string {
  return Buffer.from(
    JSON.stringify({
      s: cursor.sort,
      v: cursor.value.toISOString(),
      i: cursor.id,
    }),
  ).toString('base64url');
}

export function decodeCursorPayload(
  value: string,
  expectedSort: ApplicationSort,
): ApplicationCursor {
  const parsed = parsePayload(value);

  if (parsed.s !== expectedSort) {
    throw invalidCursor();
  }

  const date = new Date(parsed.v);

  if (Number.isNaN(date.getTime())) {
    throw invalidCursor();
  }

  return { sort: expectedSort, value: date, id: parsed.i };
}

function parsePayload(value: string): ApplicationCursorPayload {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );

    if (typeof parsed !== 'object' || parsed === null) {
      throw invalidCursor();
    }

    const record = parsed as Record<string, unknown>;

    if (
      typeof record.s !== 'string' ||
      typeof record.v !== 'string' ||
      typeof record.i !== 'string' ||
      record.s.length === 0 ||
      record.i.length === 0
    ) {
      throw invalidCursor();
    }

    return { s: record.s, v: record.v, i: record.i };
  } catch {
    throw invalidCursor();
  }
}

function invalidCursor(): ApplicationError {
  return new ApplicationError(
    'Cursor de paginação inválido.',
    'INVALID_CURSOR',
  );
}
