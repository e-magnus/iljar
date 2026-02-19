import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 40;
const MAX_CLINIC_LENGTH = 120;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LeadBody {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  clinicName?: unknown;
  captchaToken?: unknown;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function hashValue(value: string): string {
  const salt = process.env.LEAD_HASH_SALT || 'iljar-lead-salt';
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

function getIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown';
}

function passesCsrfOriginCheck(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) {
    return false;
  }

  const host = request.headers.get('host');
  if (!host) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  body.set('remoteip', ip);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return Boolean(data.success);
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('x-requested-with') !== 'iljar-landing') {
      return NextResponse.json({ error: 'Invalid request context' }, { status: 403 });
    }

    if (!passesCsrfOriginCheck(request)) {
      return NextResponse.json({ error: 'Origin check failed' }, { status: 403 });
    }

    const body = (await request.json()) as LeadBody;
    const name = normalizeString(body.name);
    const email = normalizeString(body.email).toLowerCase();
    const phone = normalizeString(body.phone);
    const clinicName = normalizeString(body.clinicName);
    const captchaToken = normalizeString(body.captchaToken);

    if (!name || name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: 'Ógilt nafn' }, { status: 400 });
    }

    if (!email || email.length > MAX_EMAIL_LENGTH || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Ógilt netfang' }, { status: 400 });
    }

    if (!phone || phone.length > MAX_PHONE_LENGTH) {
      return NextResponse.json({ error: 'Ógilt símanúmer' }, { status: 400 });
    }

    if (!clinicName || clinicName.length > MAX_CLINIC_LENGTH) {
      return NextResponse.json({ error: 'Ógilt heiti stofu' }, { status: 400 });
    }

    const ip = getIp(request);
    const ipHash = hashValue(ip);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const userAgentHash = hashValue(userAgent);

    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentAttempts = await prisma.auditLog.count({
      where: {
        entityType: 'LeadSubmission',
        action: `SUBMIT:${ipHash}`,
        createdAt: { gte: windowStart },
      },
    });

    if (recentAttempts >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'Of margar beiðnir. Reyndu aftur eftir nokkrar mínútur.' },
        { status: 429 }
      );
    }

    const captchaVerified = await verifyTurnstileToken(captchaToken, ip);
    if (!captchaVerified) {
      return NextResponse.json({ error: 'Bot-vörn mistókst' }, { status: 400 });
    }

    const leadFingerprint = hashValue(`${email}|${phone}|${clinicName}`);

    await prisma.auditLog.create({
      data: {
        entityType: 'LeadSubmission',
        entityId: leadFingerprint,
        action: `SUBMIT:${ipHash}`,
        userId: userAgentHash,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lead submission error:', error);
    return NextResponse.json(
      { error: 'Ekki tókst að senda inn beiðni. Reyndu aftur síðar.' },
      { status: 500 }
    );
  }
}
