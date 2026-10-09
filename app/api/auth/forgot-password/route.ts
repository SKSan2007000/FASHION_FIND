import { NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/auth';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const rate = checkRateLimit(`forgot-password:${ip}`, 5, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again after 1 minute.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const result = await requestPasswordReset(email);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      emailResult: result.emailResult,
    });
  } catch (err: any) {
    console.error('Forgot password API error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
