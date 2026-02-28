import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';

const profileFields = [
  'fullName',
  'phone',
  'kennitala',
  'companyName',
  'streetAddress',
  'addressLine2',
  'postalCode',
  'city',
  'country',
  'invoiceEmail',
  'bankAccount',
  'iban',
  'swiftCode',
  'vatNumber',
  'invoiceNotes',
] as const;

type ProfileField = (typeof profileFields)[number];

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error('invalid_type');
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
}

function validateProfileData(data: Partial<Record<ProfileField, string | null>>) {
  const invoiceEmail = data.invoiceEmail;
  if (invoiceEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(invoiceEmail)) {
      return { valid: false, error: 'Ógilt netfang fyrir reikninga.' };
    }
  }

  return { valid: true };
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.payload.userId },
      select: {
        fullName: true,
        phone: true,
        kennitala: true,
        companyName: true,
        streetAddress: true,
        addressLine2: true,
        postalCode: true,
        city: true,
        country: true,
        invoiceEmail: true,
        bankAccount: true,
        iban: true,
        swiftCode: true,
        vatNumber: true,
        invoiceNotes: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Notandi fannst ekki.' }, { status: 404 });
    }

    return NextResponse.json({ profile: user });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const input = body?.profile;

    if (typeof input !== 'object' || input === null) {
      return NextResponse.json({ error: 'profile object vantar.' }, { status: 400 });
    }

    const data: Partial<Record<ProfileField, string | null>> = {};

    for (const field of profileFields) {
      if (!(field in input)) {
        continue;
      }

      try {
        data[field] = normalizeOptionalString((input as Record<string, unknown>)[field]);
      } catch {
        return NextResponse.json({ error: `Ógilt gildi í reit: ${field}` }, { status: 400 });
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Engar breytingar bárust.' }, { status: 400 });
    }

    const validation = validateProfileData(data);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: auth.payload.userId },
      data,
      select: {
        fullName: true,
        phone: true,
        kennitala: true,
        companyName: true,
        streetAddress: true,
        addressLine2: true,
        postalCode: true,
        city: true,
        country: true,
        invoiceEmail: true,
        bankAccount: true,
        iban: true,
        swiftCode: true,
        vatNumber: true,
        invoiceNotes: true,
      },
    });

    return NextResponse.json({ profile: user });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: string }).code;
      if (code === 'P2002') {
        return NextResponse.json({ error: 'Kennitala er þegar í notkun hjá öðrum notanda.' }, { status: 409 });
      }
    }

    console.error('Patch profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
