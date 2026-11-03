import { invalidQueryProblem } from '../errors/problem-details';

export type SortDirection = 'asc' | 'desc';

export interface SortRule {
  field: string;
  direction: SortDirection;
}

/**
 * Parse parameter `sort`, mis. "-createdAt,plateNumber".
 * Field di luar whitelist langsung menghasilkan 400 invalid-query.
 * `id` selalu ditambahkan sebagai tie-breaker terakhir.
 */
export function parseSort<T extends string>(
  raw: string | undefined,
  allowedFields: readonly T[],
  defaultSort: string,
): SortRule[] {
  const expression = (raw ?? defaultSort).trim();

  if (!expression) {
    throw invalidQueryProblem('Parameter sort tidak boleh kosong.');
  }

  const rules: SortRule[] = [];
  const seen = new Set<string>();

  for (const part of expression.split(',')) {
    const token = part.trim();

    if (!token) {
      throw invalidQueryProblem('Parameter sort mengandung field kosong.');
    }

    const direction: SortDirection = token.startsWith('-') ? 'desc' : 'asc';
    const field = token.startsWith('-') ? token.slice(1) : token;

    if (!allowedFields.includes(field as T)) {
      throw invalidQueryProblem(
        `Field sort '${field}' tidak dikenal. Gunakan salah satu: ${allowedFields.join(', ')}.`,
      );
    }

    if (seen.has(field)) {
      throw invalidQueryProblem(`Field sort '${field}' tidak boleh duplikat.`);
    }

    seen.add(field);
    rules.push({ field, direction });
  }

  if (!seen.has('id')) {
    rules.push({ field: 'id', direction: rules[rules.length - 1].direction });
  }

  return rules;
}

export function compareByRules<T extends object>(
  left: T,
  right: T,
  rules: SortRule[],
): number {
  for (const rule of rules) {
    const leftValue = (left as Record<string, unknown>)[rule.field];
    const rightValue = (right as Record<string, unknown>)[rule.field];

    if (leftValue === rightValue) {
      continue;
    }

    if (leftValue === null || leftValue === undefined) {
      return 1;
    }

    if (rightValue === null || rightValue === undefined) {
      return -1;
    }

    let result: number;

    if (leftValue instanceof Date && rightValue instanceof Date) {
      result = leftValue.getTime() - rightValue.getTime();
    } else if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      result = leftValue - rightValue;
    } else {
      result = String(leftValue) < String(rightValue) ? -1 : 1;
    }

    if (result !== 0) {
      return rule.direction === 'asc' ? result : -result;
    }
  }

  return 0;
}
