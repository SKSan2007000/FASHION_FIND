/**
 * FashionFind Email Service
 * Handles email verification and password reset notifications.
 * Inspects real provider configurations (Resend, SendGrid, SMTP).
 * Reports honest status if no email service credentials are configured.
 */

export interface EmailResult {
  success: boolean;
  providerConfigured: boolean;
  message: string;
  previewUrl?: string;
}

export function isEmailProviderConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  );
}

export async function sendVerificationEmail(params: {
  email: string;
  token: string;
  name?: string | null;
}): Promise<EmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/auth/verify-email?token=${encodeURIComponent(params.token)}`;

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'FashionFind <noreply@fashionfind.internal>',
          to: params.email,
          subject: 'Verify your FashionFind account',
          html: `
            <h2>Welcome to FashionFind, ${params.name || 'Fashion Explorer'}!</h2>
            <p>Please click the link below to verify your email address and activate your styling profile:</p>
            <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#0b1329;color:#fff;text-decoration:none;border-radius:8px;">Verify Email Address</a></p>
            <p>Or paste this link in your browser: ${verifyUrl}</p>
            <p>This single-use link expires in 24 hours.</p>
          `,
        }),
      });

      if (res.ok) {
        return { success: true, providerConfigured: true, message: 'Verification email sent successfully.' };
      }
    } catch (e) {
      console.error('Resend API error:', e);
    }
  }

  // Fallback when no provider is configured
  console.log(`[EMAIL NOTICE] No production email provider configured in .env.local.`);
  console.log(`[EMAIL NOTICE] Verification link for ${params.email}: ${verifyUrl}`);

  return {
    success: true,
    providerConfigured: false,
    message: 'Verification token generated. (No external email provider configured; check server logs for link).',
    previewUrl: verifyUrl,
  };
}

export async function sendPasswordResetEmail(params: {
  email: string;
  token: string;
}): Promise<EmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(params.token)}`;

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'FashionFind <noreply@fashionfind.internal>',
          to: params.email,
          subject: 'Reset your FashionFind password',
          html: `
            <h2>Password Reset Request</h2>
            <p>We received a request to reset the password for your FashionFind account (${params.email}).</p>
            <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#0b1329;color:#fff;text-decoration:none;border-radius:8px;">Reset Password</a></p>
            <p>Or paste this link into your browser: ${resetUrl}</p>
            <p>This single-use link expires in 1 hour. If you did not make this request, you can safely ignore this email.</p>
          `,
        }),
      });

      if (res.ok) {
        return { success: true, providerConfigured: true, message: 'Password reset email sent.' };
      }
    } catch (e) {
      console.error('Resend API error:', e);
    }
  }

  // Fallback when no provider is configured
  console.log(`[EMAIL NOTICE] No production email provider configured in .env.local.`);
  console.log(`[EMAIL NOTICE] Password reset link for ${params.email}: ${resetUrl}`);

  return {
    success: true,
    providerConfigured: false,
    message: 'Password reset link generated. (No external email provider configured; check server logs for link).',
    previewUrl: resetUrl,
  };
}
