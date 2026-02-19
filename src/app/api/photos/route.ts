import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateUploadUrl, generatePhotoKey } from '@/lib/services/storage';
import { requireAuth } from '@/lib/auth/guard';

// Generate signed upload URL
export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const { visitId, filename, contentType, photoType } = body;

    if (!visitId || !filename || !contentType || !photoType) {
      return NextResponse.json(
        { error: 'visitId, filename, contentType, and photoType are required' },
        { status: 400 }
      );
    }

    // Validate photo type
    if (photoType !== 'BEFORE' && photoType !== 'AFTER') {
      return NextResponse.json(
        { error: 'photoType must be either BEFORE or AFTER' },
        { status: 400 }
      );
    }

    // Verify visit exists
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
    });

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      );
    }

    // Generate unique file key
    const fileKey = generatePhotoKey(visitId, filename);

    // Generate signed upload URL
    const uploadUrl = await generateUploadUrl(fileKey, contentType);

    // Create photo record with consent timestamp
    const photo = await prisma.photo.create({
      data: {
        visitId,
        fileKey,
        type: photoType,
        consentSignedAt: new Date(), // MVP: Consent is implicit at upload time
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Photo',
        entityId: photo.id,
        action: 'CREATE',
      },
    });

    return NextResponse.json({
      photo,
      uploadUrl,
    }, { status: 201 });
  } catch (error) {
    console.error('Photo upload URL generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
