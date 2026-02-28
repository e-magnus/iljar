import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json(
        { error: 'start and end query params are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
      return NextResponse.json(
        { error: 'Invalid start/end range' },
        { status: 400 }
      );
    }

    const timeOffs = await prisma.timeOff.findMany({
      where: {
        startDatetime: { lt: endDate },
        endDatetime: { gt: startDate },
      },
      orderBy: { startDatetime: 'asc' },
    });

    return NextResponse.json({ timeOffs });
  } catch (error) {
    console.error('Get time off error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const startDatetime = typeof body?.startDatetime === 'string' ? body.startDatetime : null;
    const endDatetime = typeof body?.endDatetime === 'string' ? body.endDatetime : null;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;

    if (!startDatetime || !endDatetime) {
      return NextResponse.json(
        { error: 'startDatetime and endDatetime are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDatetime);
    const end = new Date(endDatetime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json(
        { error: 'Invalid time range' },
        { status: 400 }
      );
    }

    const overlappingAppointment = await prisma.appointment.findFirst({
      where: {
        status: { not: 'CANCELLED' },
        startTime: { lt: end },
        endTime: { gt: start },
      },
      select: { id: true },
    });

    if (overlappingAppointment) {
      return NextResponse.json(
        { error: 'Cannot block over an existing appointment' },
        { status: 409 }
      );
    }

    const timeOff = await prisma.timeOff.create({
      data: {
        startDatetime: start,
        endDatetime: end,
        reason: reason && reason.length > 0 ? reason : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'TimeOff',
        entityId: timeOff.id,
        action: 'CREATE',
      },
    });

    return NextResponse.json({ timeOff }, { status: 201 });
  } catch (error) {
    console.error('Create time off error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
