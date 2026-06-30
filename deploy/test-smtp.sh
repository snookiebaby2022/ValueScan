#!/usr/bin/env bash
set -euo pipefail
cd /var/www/valuescan
set -a
source .env
set +a
node <<'NODE'
import nodemailer from 'nodemailer';

const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

try {
  const info = await t.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.SMTP_FROM,
    subject: 'ValueScan SMTP test',
    text: 'Resend is wired correctly on valuescan.online',
  });
  console.log('OK', info.messageId);
} catch (e) {
  console.error('FAIL', e.message);
  process.exit(1);
}
NODE
