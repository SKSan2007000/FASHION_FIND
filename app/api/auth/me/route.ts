import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { findUserById } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        account_status: user.account_status,
      },
    });
  } catch (err) {
    console.error('Me API error:', err);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
