import PDFDocument from 'pdfkit'
import type { AuditReport } from './audit-types.js'
import type { Branding } from './audit-runner.js'

export function reportToPdfBuffer(report: AuditReport, branding: Branding): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const brand = branding.companyName || 'ValueScan'
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(22).text(`${brand} Audit Report`, { underline: true })
    if (!branding.hideValueScan) doc.fontSize(10).fillColor('#666').text('Powered by ValueScan')
    doc.moveDown()
    doc.fillColor('#000').fontSize(11)
    doc.text(`URL: ${report.meta.url}`)
    doc.text(`Scanned: ${new Date(report.meta.scannedAt).toLocaleString('en-GB')}`)
    doc.text(`Score: ${report.overallScore}/100`, { continued: false })
    doc.moveDown()
    doc.fontSize(12).text(report.summary)
    doc.moveDown()

    doc.fontSize(14).text('Category scores')
    for (const c of report.categories) {
      doc.fontSize(10).text(`${c.label}: ${c.score}/100 (${c.pass} pass, ${c.warn} warn, ${c.fail} fail)`)
    }
    doc.moveDown()

    const priority = report.findings
      .filter((f) => f.status === 'fail' || (f.status === 'warn' && f.impact === 'high'))
      .slice(0, 15)

    if (priority.length) {
      doc.fontSize(14).text('Priority fixes')
      for (const f of priority) {
        doc.fontSize(11).fillColor('#111').text(`${f.title} [${f.status}/${f.impact}]`)
        doc.fontSize(9).fillColor('#333').text(f.description)
        if (f.recommendation) doc.text(`Fix: ${f.recommendation}`)
        doc.moveDown(0.5)
      }
    }

    doc.addPage()
    doc.fontSize(14).fillColor('#000').text('All findings')
    for (const f of report.findings) {
      doc.fontSize(10).text(`${f.category.toUpperCase()} · ${f.status} · ${f.title}`)
      doc.fontSize(8).fillColor('#444').text(f.description)
      doc.moveDown(0.3)
    }

    doc.end()
  })
}
