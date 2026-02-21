import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';

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

    const services = await prisma.service.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        displayOrder: true,
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

    const lastService = await prisma.service.findFirst({
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });
    const nextDisplayOrder = (lastService?.displayOrder ?? -1) + 1;

    const service = await prisma.service.create({
      data: {
        name,
        durationMinutes,
        displayOrder: nextDisplayOrder,
        isDefault: false,
      },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        displayOrder: true,
        isDefault: true,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error('Create service error:', error);
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
    const orderedIds = body?.orderedIds;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0 || !orderedIds.every((id) => typeof id === 'string')) {
      return NextResponse.json({ error: 'orderedIds must be a non-empty string array' }, { status: 400 });
    }

    const uniqueIds = new Set(orderedIds);
    if (uniqueIds.size !== orderedIds.length) {
      return NextResponse.json({ error: 'orderedIds must not contain duplicates' }, { status: 400 });
    }

    const existing = await prisma.service.findMany({
      where: {
        id: { in: orderedIds },
      },
      select: { id: true },
    });

    if (existing.length !== orderedIds.length) {
      return NextResponse.json({ error: 'One or more services were not found' }, { status: 404 });
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.service.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    );

    const services = await prisma.service.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        displayOrder: true,
        isDefault: true,
      },
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Reorder services error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
