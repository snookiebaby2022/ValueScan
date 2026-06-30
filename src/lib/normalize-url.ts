/** Ensure a user-entered domain/URL is ready for the audit API. */
export function normalizeAuditUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
