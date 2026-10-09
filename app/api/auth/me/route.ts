import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { findUserById } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { authenticated: false, user: null },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    const user = await findUserById(session.userId);
    if (!user) {
      return NextResponse.json(
        { authenticated: false, user: null },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          account_status: user.account_status,
          email_verified: user.email_verified,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('Me API error:', err);
    return NextResponse.json(
      { authenticated: false, user: null },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}
