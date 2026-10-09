import { NextResponse } from 'next/server';
import { verifyEmailWithToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const rate = checkRateLimit(`verify-email:${ip}`, 10, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });
    }

    const result = await verifyEmailWithToken(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to verify email address.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! Your account is now fully activated.',
    });
  } catch (err: any) {
    console.error('Verify email API error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });
    }

    const result = await verifyEmailWithToken(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to verify email address.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! Your account is now fully activated.',
    });
  } catch (err: any) {
    console.error('Verify email API error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
