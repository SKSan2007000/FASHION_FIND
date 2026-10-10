import { NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const maxAttempts = process.env.NODE_ENV === 'production' ? 10 : 100;
    const rate = checkRateLimit(`login:${ip}`, maxAttempts, 60 * 1000);
    if (!rate.allowed) {
      console.warn(`[API /api/auth/login] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again after 1 minute.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      console.warn('[API /api/auth/login] Missing email or password in request body');
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    console.log(`[API /api/auth/login] Attempting login for: ${cleanEmail}`);

    const result = await loginUser(cleanEmail, password);

    if (result.error || !result.user || !result.token) {
      console.warn(`[API /api/auth/login] Authentication failed for ${cleanEmail}: ${result.error || 'Unknown error'}`);
      return NextResponse.json({ error: result.error || 'Invalid email or password.' }, { status: 401 });
    }

    console.log(`[API /api/auth/login] Authentication successful for ${cleanEmail} (ID: ${result.user.id}, Role: ${result.user.role})`);

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
    console.error('[API /api/auth/login] Unexpected error:', err);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
