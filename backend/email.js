const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@valuescan.online';

const transporter = SMTP_USER && SMTP_PASS ? nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
}) : null;

async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.log('[EMAIL MOCK] Would send to:', to, 'Subject:', subject);
    return { success: true, mock: true };
  }
  try {
    const result = await transporter.sendMail({
      from: `"ValueScan" <${FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message);
    return { success: false, error: err.message };
  }
}

// Colors: #7c3aed primary, #0F172A dark, #F8FAFC light
function emailBase(htmlContent, title) {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${title}</title>
  <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .wrapper { width: 100% !important; }
      .content-cell { padding: 24px 16px !important; }
      .footer-cell { padding: 24px 16px !important; }
      .header-cell { padding: 24px 16px !important; }
      .mobile-text { font-size: 15px !important; line-height: 24px !important; }
      .mobile-heading { font-size: 22px !important; line-height: 28px !important; }
      .btn { display: inline-block !important; padding: 14px 28px !important; }
    }
    @media (prefers-color-scheme: dark) {
      .body-bg { background-color: #0F172A !important; }
      .content-bg { background-color: #0F172A !important; }
      .body-text { color: #F8FAFC !important; }
      .subtle-text { color: #CBD5E1 !important; }
    }
  </style>
</head>
<body class="body-bg" style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" class="body-bg" style="background-color: #F8FAFC;">
    <tr>
      <td align="center" valign="top">
        <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="600" class="wrapper" style="width: 600px; max-width: 600px;">
          <!-- Header -->
          <tr>
            <td class="header-cell" style="background-color: #0F172A; padding: 32px 40px; text-align: center; border-radius: 0;">
              <a href="https://valuescan.online" style="text-decoration: none; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; display: inline-block;" target="_blank">
                ValueScan
              </a>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td class="content-cell content-bg" style="background-color: #ffffff; padding: 40px; color: #1E293B; font-size: 16px; line-height: 26px;">
              ${htmlContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="footer-cell" style="background-color: #0F172A; padding: 32px 40px; text-align: center; color: #94A3B8; font-size: 13px; line-height: 20px;">
              <p style="margin: 0 0 8px 0;">
                <a href="https://valuescan.online" style="color: #F8FAFC; text-decoration: none; font-weight: 600;" target="_blank">valuescan.online</a>
              </p>
              <p style="margin: 0 0 12px 0;">
                <a href="https://twitter.com/ValueScan" style="color: #94A3B8; text-decoration: none; margin: 0 8px;" target="_blank">X</a>
                <a href="https://linkedin.com/company/valuescan" style="color: #94A3B8; text-decoration: none; margin: 0 8px;" target="_blank">LinkedIn</a>
                <a href="https://github.com/valuescan" style="color: #94A3B8; text-decoration: none; margin: 0 8px;" target="_blank">GitHub</a>
              </p>
              <p style="margin: 0 0 4px 0;" class="subtle-text">© 2026 ValueScan. All rights reserved.</p>
              <p style="margin: 0;">
                <a href="https://valuescan.online/account/notifications" style="color: #94A3B8; text-decoration: underline;" target="_blank">Manage email preferences</a>
                &nbsp;·&nbsp;
                <a href="https://valuescan.online/unsubscribe" style="color: #94A3B8; text-decoration: underline;" target="_blank">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

async function sendVerificationEmail(email, token, name) {
  const verifyUrl = `https://valuescan.online/verify-email?token=${token}`;
  const html = emailBase(`
    <h1 class="mobile-heading" style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #0F172A; line-height: 30px;">Welcome, ${name || 'there'}!</h1>
    <p class="mobile-text" style="margin: 0 0 16px 0;">Thank you for signing up. Please verify your email address to get started.</p>
    <p style="margin: 0 0 24px 0; text-align: center;">
      <a href="${verifyUrl}" class="btn" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; mso-padding-alt: 0; text-underline-color: #7c3aed;" target="_blank">Verify Email</a>
    </p>
    <p class="subtle-text" style="margin: 0 0 8px 0; font-size: 14px; color: #64748B;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #475569; word-break: break-all;">${verifyUrl}</p>
    <p class="subtle-text" style="margin: 0; font-size: 13px; color: #94A3B8;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
  `, 'Verify your email');
  return sendEmail({
    to: email,
    subject: 'Verify your ValueScan email',
    html,
    text: `Welcome to ValueScan! Verify your email: ${verifyUrl}`,
  });
}

async function sendPasswordResetEmail(email, token) {
  const resetUrl = `https://valuescan.online/reset-password?token=${token}`;
  const html = emailBase(`
    <h1 class="mobile-heading" style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #0F172A; line-height: 30px;">Password Reset</h1>
    <p class="mobile-text" style="margin: 0 0 16px 0;">We received a request to reset your password. Click the button below to choose a new password.</p>
    <p style="margin: 0 0 24px 0; text-align: center;">
      <a href="${resetUrl}" class="btn" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; mso-padding-alt: 0; text-underline-color: #7c3aed;" target="_blank">Reset Password</a>
    </p>
    <p class="subtle-text" style="margin: 0 0 8px 0; font-size: 14px; color: #64748B;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #475569; word-break: break-all;">${resetUrl}</p>
    <p class="subtle-text" style="margin: 0; font-size: 13px; color: #94A3B8;">This link expires in 1 hour. If you didn't request this reset, you can safely ignore this email.</p>
  `, 'Reset your password');
  return sendEmail({
    to: email,
    subject: 'Reset your ValueScan password',
    html,
    text: `Reset your password: ${resetUrl}`,
  });
}

async function sendAlertEmail(email, url, oldScore, newScore) {
  const direction = newScore > oldScore ? 'improved' : 'dropped';
  const accentColor = newScore > oldScore ? '#22c55e' : '#ef4444';
  const html = emailBase(`
    <h1 class="mobile-heading" style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: ${accentColor}; line-height: 30px;">Score ${direction.charAt(0).toUpperCase() + direction.slice(1)}</h1>
    <p class="mobile-text" style="margin: 0 0 16px 0;">Your audit for <strong style="color: #0F172A;">${url}</strong> has ${direction}:</p>
    <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
      <tr>
        <td style="padding: 12px 20px; background-color: #F1F5F9; border-radius: 6px 0 0 6px; font-size: 14px; color: #64748B;">Old</td>
        <td style="padding: 12px 20px; background-color: #F1F5F9; border-radius: 0 6px 6px 0; font-size: 18px; font-weight: 700; color: #0F172A;">${oldScore} → ${newScore}</td>
      </tr>
    </table>
    <p style="margin: 0 0 24px 0; text-align: center;">
      <a href="https://valuescan.online/audits" class="btn" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; mso-padding-alt: 0; text-underline-color: #7c3aed;" target="_blank">View Details</a>
    </p>
    <p class="subtle-text" style="margin: 0; font-size: 13px; color: #94A3B8;">You can manage your alert preferences in your account settings.</p>
  `, `Alert: ${url} score ${direction}`);
  return sendEmail({
    to: email,
    subject: `Alert: ${url} score ${direction} to ${newScore}`,
    html,
    text: `Your audit for ${url} has ${direction}: ${oldScore} → ${newScore}`,
  });
}

async function sendTeamInviteEmail(email, acceptUrl, inviterName) {
  const fullAcceptUrl = `https://valuescan.online${acceptUrl}`;
  const html = emailBase(`
    <h1 class="mobile-heading" style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #0F172A; line-height: 30px;">Team Invitation</h1>
    <p class="mobile-text" style="margin: 0 0 16px 0;"><strong style="color: #0F172A;">${inviterName || 'A team owner'}</strong> has invited you to join their ValueScan team on the <strong style="color: #0F172A;">Max plan</strong>.</p>
    <p class="mobile-text" style="margin: 0 0 24px 0;">Click the button below to accept the invitation. You'll need a ValueScan account to join.</p>
    <p style="margin: 0 0 24px 0; text-align: center;">
      <a href="${fullAcceptUrl}" class="btn" style="display: inline-block; padding: 14px 32px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; mso-padding-alt: 0; text-underline-color: #7c3aed;" target="_blank">Accept Invitation</a>
    </p>
    <p class="subtle-text" style="margin: 0 0 8px 0; font-size: 14px; color: #64748B;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="margin: 0 0 24px 0; font-size: 13px; color: #475569; word-break: break-all;">${fullAcceptUrl}</p>
    <p class="subtle-text" style="margin: 0; font-size: 13px; color: #94A3B8;">This link expires in 7 days. If you weren't expecting this invitation, you can safely ignore it.</p>
  `, 'Team invitation');
  return sendEmail({
    to: email,
    subject: `${inviterName || 'Someone'} invited you to join their ValueScan team`,
    html,
    text: `Team invitation from ${inviterName || 'a team owner'}. Accept here: ${fullAcceptUrl}`,
  });
}

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail, sendAlertEmail, sendTeamInviteEmail };
