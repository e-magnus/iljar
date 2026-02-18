import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointmentId, soapS, soapO, soapA, soapP } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'appointmentId is required' },
        { status: 400 }
      );
    }

    // Verify appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Create visit
    const visit = await prisma.visit.create({
      data: {
        appointmentId,
        soapS,
        soapO,
        soapA,
        soapP,
      },
    });

    // Update appointment status to completed
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'COMPLETED' },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Visit',
        entityId: visit.id,
        action: 'CREATE',
      },
    });

    return NextResponse.json({ visit }, { status: 201 });
  } catch (error) {
    console.error('Create visit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
