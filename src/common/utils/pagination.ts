export interface OffsetMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface OffsetPage<T> {
  data: T[];
  meta: OffsetMeta;
}

export function buildOffsetMeta(
  page: number,
  limit: number,
  totalItems: number,
): OffsetMeta {
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
  };
}
