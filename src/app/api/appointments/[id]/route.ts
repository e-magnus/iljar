import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';
import { generateDownloadUrl } from '@/lib/services/storage';

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
    const { status, note } = body;

    const data: {
      status?: 'BOOKED' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
      note?: string | null;
    } = {};
    
    if (status) data.status = status;
    if (note !== undefined) data.note = note;

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
    console.error('Update appointment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
