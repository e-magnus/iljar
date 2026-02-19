import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const statusMap = {
  arrived: 'ARRIVED',
  completed: 'COMPLETED',
  no_show: 'NO_SHOW',
} as const;

type StatusAction = keyof typeof statusMap;

function isAllowedTransition(from: string, to: string): boolean {
  if (from === to) {
    return true;
  }

  const transitions: Record<string, string[]> = {
    BOOKED: ['ARRIVED', 'NO_SHOW', 'CANCELLED'],
    ARRIVED: ['COMPLETED', 'NO_SHOW'],
    COMPLETED: [],
    NO_SHOW: [],
    CANCELLED: [],
  };

  return (transitions[from] ?? []).includes(to);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();
    const action = body?.action as StatusAction | undefined;

    if (!action || !(action in statusMap)) {
      return NextResponse.json(
        { error: 'action must be one of: arrived, completed, no_show' },
        { status: 400 }
      );
    }

    const targetStatus = statusMap[action];

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (!isAllowedTransition(appointment.status, targetStatus)) {
      return NextResponse.json(
        { error: `Invalid transition from ${appointment.status} to ${targetStatus}` },
        { status: 409 }
      );
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status: targetStatus },
      include: {
        client: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'Appointment',
        entityId: id,
        action: `STATUS_${targetStatus}`,
        userId: auth.payload.userId,
      },
    });

    return NextResponse.json({ appointment: updatedAppointment });
  } catch (error) {
    console.error('Appointment status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
