import { NextResponse } from 'next/server';
import { bootstrapAdmin } from '@/lib/auth';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const rate = checkRateLimit(`bootstrap:${ip}`, 5, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many bootstrap attempts.' }, { status: 429 });
    }

    const body = await req.json();
    const { email, password, secret, name } = body;

    if (!email || !password || !secret) {
      return NextResponse.json(
        { error: 'Email, password, and bootstrap secret are required.' },
        { status: 400 }
      );
    }

    const result = await bootstrapAdmin({ email, password, secret, name });

    if (!result.success || !result.user) {
      return NextResponse.json({ error: result.error || 'Bootstrap failed.' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: 'Administrator account established successfully.',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    });
  } catch (err) {
    console.error('Bootstrap API error:', err);
    return NextResponse.json({ error: 'Bootstrap failed.' }, { status: 500 });
  }
}
