import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';

const DEFAULT_SERVICES = [
  { name: 'Full fótaaðgerð', durationMinutes: 60 },
  { name: 'Fótaaðgerð', durationMinutes: 30 },
  { name: 'Smáaðgerð', durationMinutes: 15 },
];

function normalizeName(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validateDuration(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 5 && (value as number) <= 240;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const servicesCount = await prisma.service.count();
    if (servicesCount === 0) {
      await prisma.service.createMany({
        data: DEFAULT_SERVICES.map((service) => ({
          ...service,
          isDefault: true,
        })),
        skipDuplicates: true,
      });
    }

    const services = await prisma.service.findMany({
      orderBy: [{ durationMinutes: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        isDefault: true,
      },
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Get services error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const name = normalizeName(body?.name);
    const durationMinutes = body?.durationMinutes;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!validateDuration(durationMinutes)) {
      return NextResponse.json(
        { error: 'durationMinutes must be an integer between 5 and 240' },
        { status: 400 }
      );
    }

    const existing = await prisma.service.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: 'Service name already exists' }, { status: 409 });
    }

    const service = await prisma.service.create({
      data: {
        name,
        durationMinutes,
        isDefault: false,
      },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        isDefault: true,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error('Create service error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
