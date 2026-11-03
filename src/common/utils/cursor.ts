import { invalidQueryProblem } from '../errors/problem-details';

export interface TicketCursor {
  entryTime: Date;
  id: number;
}

/**
 * Cursor tiket = base64 dari JSON {"t": "<entryTime ISO>", "id": <id>}.
 */
export function encodeTicketCursor(entryTime: Date, id: number): string {
  return Buffer.from(
    JSON.stringify({ t: entryTime.toISOString(), id }),
    'utf8',
  ).toString('base64');
}

export function decodeTicketCursor(cursor: string): TicketCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64').toString('utf8'),
    ) as { t?: unknown; id?: unknown };

    if (typeof parsed.t !== 'string' || typeof parsed.id !== 'number') {
      throw new Error('Format cursor salah');
    }

    if (!Number.isInteger(parsed.id) || parsed.id < 1) {
      throw new Error('ID cursor salah');
    }

    const entryTime = new Date(parsed.t);

    if (Number.isNaN(entryTime.getTime())) {
      throw new Error('Tanggal cursor salah');
    }

    return { entryTime, id: parsed.id };
  } catch {
    throw invalidQueryProblem('Parameter cursor tidak valid.');
  }
}
