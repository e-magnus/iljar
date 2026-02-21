import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';

function normalizeName(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validateDuration(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 5 && (value as number) <= 240;
}

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Service id is required' }, { status: 400 });
    }

    const existing = await prisma.service.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
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

    const duplicate = await prisma.service.findFirst({
      where: {
        id: { not: id },
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json({ error: 'Service name already exists' }, { status: 409 });
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        name,
        durationMinutes,
      },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        displayOrder: true,
        isDefault: true,
      },
    });

    return NextResponse.json({ service });
  } catch (error) {
    console.error('Update service error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Service id is required' }, { status: 400 });
    }

    const existing = await prisma.service.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete service error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
