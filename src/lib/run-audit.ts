import type { AuditReport } from '../../server/lib/audit-types';

export type QuickAuditResult = {
  score: number;
  issues: number;
  warnings: number;
  url: string;
  reportId: string;
  categories: Record<string, { score: number; max: number }>;
};

function authHeaders(): HeadersInit {
  const headers: HeadersInit = { Accept: 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function mapReport(report: AuditReport): QuickAuditResult {
  const categories: Record<string, { score: number; max: number }> = {};
  for (const c of report.categories) {
    categories[c.category] = { score: c.score, max: 100 };
  }
  return {
    score: report.overallScore,
    issues: report.findings.filter((f) => f.status === 'fail').length,
    warnings: report.findings.filter((f) => f.status === 'warn').length,
    url: report.meta.finalUrl || report.meta.url,
    reportId: report.id,
    categories,
  };
}

function mapPayload(data: Record<string, unknown>): QuickAuditResult {
  if (data.report && typeof data.report === 'object') {
    return mapReport(data.report as AuditReport);
  }

  const rawCategories = (data.categories ?? {}) as Record<string, { score: number; max?: number }>;
  const categories: QuickAuditResult['categories'] = {};
  for (const [key, cat] of Object.entries(rawCategories)) {
    const pct = cat.max && cat.max > 0
      ? Math.round((cat.score / cat.max) * 100)
      : cat.score;
    categories[key] = { score: pct, max: 100 };
  }

  return {
    score: Number(data.score ?? 0),
    issues: Number(data.issues ?? 0),
    warnings: Number(data.warnings ?? 0),
    url: String(data.url ?? ''),
    reportId: String(data.reportId ?? data.id ?? ''),
    categories,
  };
}

/** Run a website audit (GET for CDN compatibility, POST fallback). */
export async function runQuickAudit(url: string): Promise<QuickAuditResult> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error('URL is required');

  const encodedUrl = encodeURIComponent(trimmed);
  const headers = authHeaders();

  let res = await fetch(`/api/audit?url=${encodedUrl}`, { method: 'GET', headers });

  if (!res.ok && (res.status === 404 || res.status === 405)) {
    res = await fetch('/api/audit/scan', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: trimmed }),
    });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : `Server returned ${res.status}`,
    );
  }

  return mapPayload(data);
}
