import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAllUsers } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Server-side RBAC guard
    await requireAdmin();

    const users = await getAllUsers(200);

    return NextResponse.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED' || err.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Access denied: Administrator role required.' }, { status: 403 });
    }
    console.error('Admin users API error:', err);
    return NextResponse.json({ error: 'Failed to retrieve registered users.' }, { status: 500 });
  }
}
