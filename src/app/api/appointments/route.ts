import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Get all appointments or create new
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const next = searchParams.get('next') === 'true';
    const clientId = searchParams.get('clientId');

    if (next) {
      // Get next upcoming appointment
      const appointment = await prisma.appointment.findFirst({
        where: {
          startTime: { gte: new Date() },
          status: { not: 'CANCELLED' },
        },
        orderBy: { startTime: 'asc' },
        include: {
          client: true,
        },
      });

      return NextResponse.json({ appointment });
    }

    const where: any = {};
    if (clientId) {
      where.clientId = clientId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: true,
      },
      orderBy: { startTime: 'desc' },
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Get appointments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, startTime, endTime, type, note } = body;

    if (!clientId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'clientId, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Validate times
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Check for overlapping appointments
    const overlapping = await prisma.appointment.findFirst({
      where: {
        status: { not: 'CANCELLED' },
        OR: [
          {
            AND: [
              { startTime: { lte: start } },
              { endTime: { gt: start } },
            ],
          },
          {
            AND: [
              { startTime: { lt: end } },
              { endTime: { gte: end } },
            ],
          },
          {
            AND: [
              { startTime: { gte: start } },
              { endTime: { lte: end } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { error: 'Time slot is already booked' },
        { status: 409 }
      );
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        startTime: start,
        endTime: end,
        status: 'BOOKED',
        type,
        note,
      },
      include: {
        client: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Appointment',
        entityId: appointment.id,
        action: 'CREATE',
      },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('Create appointment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
