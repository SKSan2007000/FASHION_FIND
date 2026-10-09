import { NextResponse } from 'next/server';
import { recordSiteEvent } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/security';

const ALLOWED_EVENT_TYPES = [
  'visit',
  'page_view',
  'product_view',
  'affiliate_click',
  'recommendation_run',
  'sign_in',
  'sign_up',
];

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const rate = checkRateLimit(`track:${ip}`, 100, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json();
    const eventType = body.type || body.event_type || 'visit';

    if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json({ ok: false, error: 'Invalid event type' }, { status: 400 });
    }

    const session = await getCurrentSession();

    await recordSiteEvent({
      event_type: eventType,
      product_id: body.productId || body.product_id || null,
      session_id: body.sessionId || body.session_id || null,
      user_id: session?.userId || null,
      path: body.path || null,
      metadata: body.metadata || {},
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
