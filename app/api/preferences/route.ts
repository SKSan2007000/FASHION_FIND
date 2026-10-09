import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getUserPreferences, saveUserPreferences } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Sign in to access saved styling preferences.' }, { status: 401 });
    }

    const prefs = await getUserPreferences(session.userId);
    return NextResponse.json({ success: true, preferences: prefs });
  } catch (err) {
    console.error('Get preferences error:', err);
    return NextResponse.json({ error: 'Failed to fetch preferences.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Sign in to save styling preferences.' }, { status: 401 });
    }

    const body = await req.json();
    const { gender, occasion, styleDirection, preferredColor, budget, skinTone, preferences } = body;

    const saved = await saveUserPreferences({
      id: '',
      user_id: session.userId,
      gender,
      occasion,
      style_direction: styleDirection,
      preferred_color: preferredColor,
      budget,
      skin_tone: skinTone,
      preferences: preferences || [],
    });

    return NextResponse.json({ success: true, preferences: saved });
  } catch (err) {
    console.error('Save preferences error:', err);
    return NextResponse.json({ error: 'Failed to save preferences.' }, { status: 500 });
  }
}
