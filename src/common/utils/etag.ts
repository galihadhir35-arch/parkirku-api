/**
 * ETag kendaraan mengikuti kontrak: "v<version>".
 */
export function formatVehicleEtag(version: number): string {
  return `"v${version}"`;
}

/**
 * Cocokkan header If-Match / If-None-Match yang boleh berisi
 * beberapa ETag dipisah koma. Weak ETag (W/"...") juga diterima.
 */
export function etagMatches(
  headerValue: string | undefined,
  version: number,
): boolean {
  if (!headerValue) {
    return false;
  }

  const expected = formatVehicleEtag(version);
  const weakExpected = `W/${expected}`;

  return headerValue
    .split(',')
    .map((value) => value.trim())
    .some((value) => value === expected || value === weakExpected);
}
