import { NextResponse } from 'next/server';
import { getProducts, recordSiteEvent } from '@/lib/db';
import { generateSmartRecommendations, StylePreferenceInput } from '@/lib/recommendations';
import { getCurrentSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      gender,
      occasion = 'Casual',
      styleDirection = 'CASUAL',
      preferredColor,
      skinTone,
      budget,
      specificPreference,
      sessionId,
    } = body;

    if (!gender || (gender !== 'MEN' && gender !== 'WOMEN')) {
      return NextResponse.json(
        { error: 'Valid gender selection (MEN or WOMEN) is required.' },
        { status: 400 }
      );
    }

    const input: StylePreferenceInput = {
      gender,
      occasion,
      styleDirection,
      preferredColor,
      skinTone,
      budget,
      specificPreference,
    };

    // Retrieve published catalog from database
    const catalog = await getProducts({ publishedOnly: true, gender });

    // Generate recommendations using genuine catalog items only
    const result = generateSmartRecommendations(catalog, input);

    // Record anonymous or authenticated recommendation event
    const session = await getCurrentSession();
    await recordSiteEvent({
      event_type: 'recommendation_run',
      session_id: sessionId || null,
      user_id: session?.userId || null,
      path: '/style',
      metadata: {
        gender,
        occasion,
        styleDirection,
        outfitCount: result.outfits.length,
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Recommendations API error:', err);
    return NextResponse.json(
      { error: 'Failed to generate recommendations.' },
      { status: 500 }
    );
  }
}
