import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';
import { generateDownloadUrl } from '@/lib/services/storage';

function isOverlapConstraintError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2004' && error.message.includes('appointment_no_overlap_active');
  }

  const databaseError = error as { code?: string; constraint?: string; message?: string };
  return (
    databaseError.code === '23P01' ||
    databaseError.constraint === 'appointment_no_overlap_active' ||
    databaseError.message?.includes('appointment_no_overlap_active') === true
  );
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: true,
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            photos: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const visitsWithPhotoUrls = await Promise.all(
      appointment.visits.map(async (visit) => {
        const photosWithUrls = await Promise.all(
          visit.photos.map(async (photo) => ({
            ...photo,
            downloadUrl: await generateDownloadUrl(photo.fileKey),
          }))
        );

        return {
          ...visit,
          photos: photosWithUrls,
        };
      })
    );

    return NextResponse.json({
      appointment: {
        ...appointment,
        visits: visitsWithPhotoUrls,
      },
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();
    const { status, note, startTime, endTime } = body;

    const data: {
      status?: 'BOOKED' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
      note?: string | null;
      startTime?: Date;
      endTime?: Date;
    } = {};
    
    if (status) data.status = status;
    if (note !== undefined) data.note = note;

    if ((startTime && !endTime) || (!startTime && endTime)) {
      return NextResponse.json(
        { error: 'startTime and endTime must be provided together' },
        { status: 400 }
      );
    }

    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);

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

      const overlapping = await prisma.appointment.findFirst({
        where: {
          id: { not: id },
          status: { not: 'CANCELLED' },
          OR: [
            {
              AND: [{ startTime: { lte: start } }, { endTime: { gt: start } }],
            },
            {
              AND: [{ startTime: { lt: end } }, { endTime: { gte: end } }],
            },
            {
              AND: [{ startTime: { gte: start } }, { endTime: { lte: end } }],
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

      data.startTime = start;
      data.endTime = end;
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data,
      include: {
        client: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Appointment',
        entityId: appointment.id,
        action: 'UPDATE',
      },
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    if (isOverlapConstraintError(error)) {
      return NextResponse.json(
        { error: 'Time slot is already booked' },
        { status: 409 }
      );
    }

    console.error('Update appointment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
