import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

const allowedEvents = new Set([
  'view_landing',
  'click_primary_cta',
  'click_login',
  'submit_lead_form',
  'scroll_75_percent',
]);

interface AnalyticsBody {
  event?: unknown;
  metadata?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyticsBody;
    const event = typeof body.event === 'string' ? body.event : '';

    if (!allowedEvents.has(event)) {
      return NextResponse.json({ error: 'Unsupported event' }, { status: 400 });
    }

    const metadata = body.metadata && typeof body.metadata === 'object'
      ? JSON.stringify(body.metadata).slice(0, 150)
      : '';

    await prisma.auditLog.create({
      data: {
        entityType: 'AnalyticsEvent',
        entityId: event,
        action: metadata || 'track',
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
