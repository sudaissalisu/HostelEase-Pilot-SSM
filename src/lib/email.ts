/**
 * SSM Pilot — Email delivery (mirrors the hostel portal's email system).
 *
 * Supports SMTP + Resend API. Provider is chosen via the EMAIL_PROVIDER
 * env var (defaults to 'smtp').
 *
 * Used for: SSM staff notifications, invoice emails, contract emails,
 * license expiry alerts, etc.
 */

import nodemailer from 'nodemailer'
import type { TransportOptions } from 'nodemailer'

export interface SendEmailParams {
  to: string
  subject: string
  body: string
  html?: string
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const provider = process.env.EMAIL_PROVIDER || 'smtp'

  if (provider === 'resend') {
    return sendViaResend(params)
  }
  return sendViaSmtp(params)
}

async function sendViaSmtp(params: SendEmailParams): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10)
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (!smtpUser || !smtpPass) {
    console.error('[ssm-email] SMTP credentials missing')
    return false
  }

  const fromName = process.env.SMTP_FROM_NAME || 'SSM Pilot'
  const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    } as TransportOptions)

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: params.to,
      subject: params.subject,
      text: params.body,
      html: params.html || params.body.replace(/\n/g, '<br>'),
    })

    if (info.response && info.response.startsWith('250')) {
      console.log(`[ssm-email] SMTP SUCCESS: ${params.to} | ${info.messageId}`)
      return true
    }
    console.error('[ssm-email] SMTP non-250:', info.response)
    return false
  } catch (err) {
    console.error('[ssm-email] SMTP failed:', err instanceof Error ? err.message : String(err))
    return false
  }
}

async function sendViaResend(params: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[ssm-email] RESEND_API_KEY not set')
    return false
  }

  const fromName = process.env.SMTP_FROM_NAME || 'SSM Pilot'
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@ssm.com.ng'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `"${fromName}" <${fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html || params.body.replace(/\n/g, '<br>'),
        text: params.body,
      }),
    })

    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      if (data.id) {
        console.log(`[ssm-email] Resend SUCCESS: ${params.to} | ${data.id}`)
        return true
      }
    }
    console.error('[ssm-email] Resend failed:', res.status, res.statusText)
    return false
  } catch (err) {
    console.error('[ssm-email] Resend error:', err instanceof Error ? err.message : String(err))
    return false
  }
}
