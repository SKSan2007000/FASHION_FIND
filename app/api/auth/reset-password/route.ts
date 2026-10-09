import { NextResponse } from 'next/server';
import { resetPasswordWithToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const rate = checkRateLimit(`reset-password:${ip}`, 5, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again after 1 minute.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { token, password, confirmPassword } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and new password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Password and password confirmation do not match.' },
        { status: 400 }
      );
    }

    const result = await resetPasswordWithToken({
      token,
      newPassword: password,
      confirmPassword,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to reset password.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new credentials.',
    });
  } catch (err: any) {
    console.error('Reset password API error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
