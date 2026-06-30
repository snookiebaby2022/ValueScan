import { randomUUID } from 'crypto'
import type { AuditFinding } from './audit-types.js'

function finding(
  title: string,
  description: string,
  status: AuditFinding['status'],
  impact: AuditFinding['impact'],
  recommendation?: string,
  value?: string,
  fixSnippet?: string,
): AuditFinding {
  return {
    id: randomUUID(),
    category: 'accessibility',
    title,
    description,
    status,
    impact,
    recommendation,
    value,
    fixSnippet,
  }
}

function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) ?? []).length
}

export function runAccessibilityChecks(html: string, findings: AuditFinding[]) {
  const imgCount = countMatches(html, /<img[\s>]/gi)
  const imgsWithAlt = countMatches(html, /<img[^>]+alt=["'][^"']*["']/gi)
  const emptyAlt = countMatches(html, /<img[^>]+alt=["']\s*["']/gi)
  const inputs = countMatches(html, /<input[\s>]/gi)
  const inputsLabeled = countMatches(html, /<label[^>]+for=/gi)
  const buttons = countMatches(html, /<button[\s>]/gi)
  const ariaLabels = countMatches(html, /aria-label=["'][^"']+["']/gi)
  const roleButton = countMatches(html, /role=["']button["']/gi)
  const skipLink = /skip to (main|content)/i.test(html) || /#main/i.test(html)

  if (imgCount === 0) {
    findings.push(finding('Images on page', 'No images detected.', 'info', 'low'))
  } else if (imgsWithAlt < imgCount) {
    const missing = imgCount - imgsWithAlt
    findings.push(finding(
      'Images missing alt text',
      `${missing} of ${imgCount} images lack meaningful alt attributes.`,
      'fail',
      'high',
      'Add descriptive alt text to all informative images; use alt="" for decorative images.',
      `${imgsWithAlt}/${imgCount} with alt`,
      '<img src="photo.jpg" alt="Describe the image purpose">',
    ))
  } else {
    findings.push(finding('Image alt text', 'All images have alt attributes.', 'pass', 'low'))
  }

  if (emptyAlt > 0) {
    findings.push(finding('Empty alt attributes', `${emptyAlt} image(s) have empty alt.`, 'warn', 'low', 'Use alt="" only for purely decorative images.'))
  }

  if (inputs > 0 && inputsLabeled < inputs && ariaLabels < inputs) {
    findings.push(finding(
      'Form labels',
      'Some inputs may lack associated labels or aria-label.',
      'warn',
      'high',
      'Associate each input with a <label for="id"> or aria-label.',
      `${inputs} inputs, ${inputsLabeled} labels`,
      '<label for="email">Email</label>\n<input id="email" type="email">',
    ))
  } else if (inputs > 0) {
    findings.push(finding('Form labels', 'Form inputs appear labelled.', 'pass', 'low'))
  }

  const hasLang = /<html[^>]+lang=["'][^"']+["']/i.test(html)
  if (!hasLang) {
    findings.push(finding('Document language', 'Missing lang attribute on <html>.', 'fail', 'high', 'Add lang="en" (or appropriate locale).', undefined, '<html lang="en-GB">'))
  } else {
    findings.push(finding('Document language', 'Page language is declared.', 'pass', 'low'))
  }

  if (!skipLink) {
    findings.push(finding('Skip navigation link', 'No skip-to-content link detected.', 'warn', 'medium', 'Add a skip link as the first focusable element for keyboard users.'))
  } else {
    findings.push(finding('Skip navigation', 'Skip link detected.', 'pass', 'low'))
  }

  if (buttons + roleButton === 0 && inputs > 0) {
    findings.push(finding('Interactive controls', 'Forms present but few explicit button elements.', 'info', 'low'))
  }

  const tabindexPositive = countMatches(html, /tabindex=["'][1-9]/gi)
  if (tabindexPositive > 0) {
    findings.push(finding('Positive tabindex', `${tabindexPositive} positive tabindex value(s) found.`, 'warn', 'medium', 'Avoid tabindex > 0; use natural DOM order instead.'))
  }

  const lowContrastHint = /<font[^>]+color=/i.test(html)
  if (lowContrastHint) {
    findings.push(finding('Legacy font colors', 'Deprecated <font color> tags may cause contrast issues.', 'warn', 'medium', 'Use CSS with WCAG AA contrast ratios (4.5:1 for text).'))
  }
}
