export type AuditStatus = 'pass' | 'warn' | 'fail' | 'info'

export type AuditCategory = 'seo' | 'sem' | 'marketing' | 'security' | 'technical' | 'accessibility'

export type AuditFixOption = {
  label: string
  steps?: string[]
  snippet?: string
}

export type AuditFinding = {
  id: string
  category: AuditCategory
  title: string
  description: string
  status: AuditStatus
  impact: 'high' | 'medium' | 'low'
  recommendation?: string
  value?: string
  fixSnippet?: string
  fixOptions?: AuditFixOption[]
}

export type CategoryScore = {
  category: AuditCategory
  score: number
  label: string
  pass: number
  warn: number
  fail: number
  info: number
}

export type AuditMeta = {
  url: string
  finalUrl: string
  scannedAt: string
  responseTimeMs: number
  statusCode: number
  pageSizeBytes: number
  contentType: string | null
  ttfbMs?: number
}

export type SiteAuditSummary = {
  pagesScanned: number
  pageResults: Array<{ url: string; score: number }>
}

export type AuditReport = {
  id: string
  meta: AuditMeta
  overallScore: number
  categories: CategoryScore[]
  findings: AuditFinding[]
  summary: string
  siteAudit?: SiteAuditSummary
}
