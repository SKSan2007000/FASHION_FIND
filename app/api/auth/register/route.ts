import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const rate = checkRateLimit(`register:${ip}`, 10, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many registration requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const result = await registerUser({ email, password, name, role: 'USER' });

    if (result.error || !result.user || !result.token) {
      return NextResponse.json({ error: result.error || 'Registration failed.' }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    });

    response.cookies.set('fashionfind_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600,
    });

    return response;
  } catch (err: any) {
    console.error('Registration API error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
