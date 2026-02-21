import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;

    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Get client error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name, phone, kennitala, clinicalFlags, customClinicalFlags, contactNote } = body;

    const validClinicalFlags = ['ANTICOAGULANT', 'DIABETES', 'ALLERGY', 'NEUROPATHY', 'PACEMAKER', 'OTHER'] as const;

    if (clinicalFlags !== undefined) {
      if (!Array.isArray(clinicalFlags) || !clinicalFlags.every((flag) => validClinicalFlags.includes(flag))) {
        return NextResponse.json(
          { error: 'clinicalFlags contains invalid values' },
          { status: 400 }
        );
      }
    }

    if (customClinicalFlags !== undefined) {
      if (!Array.isArray(customClinicalFlags) || !customClinicalFlags.every((flag) => typeof flag === 'string')) {
        return NextResponse.json(
          { error: 'customClinicalFlags must be an array of strings' },
          { status: 400 }
        );
      }
    }

    const existingClient = await prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const updateData: {
      name?: string;
      phone?: string;
      kennitala?: string | null;
      clinicalFlags?: Array<(typeof validClinicalFlags)[number]>;
      customClinicalFlags?: string[];
      contactNote?: string | null;
    } = {};

    if (typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim();
    }

    if (typeof phone === 'string' && phone.trim().length > 0) {
      updateData.phone = phone.trim();
    }

    if (kennitala !== undefined) {
      updateData.kennitala = kennitala;
    }

    if (clinicalFlags !== undefined) {
      updateData.clinicalFlags = clinicalFlags;
    }

    if (customClinicalFlags !== undefined) {
      const normalized: string[] = Array.from(
        new Map<string, string>(
          customClinicalFlags
            .map((flag: string) => flag.trim().replace(/\s+/g, ' '))
            .filter((flag: string) => flag.length > 0)
            .map((flag: string) => [flag.toLocaleLowerCase('is'), flag])
        ).values()
      );

      updateData.customClinicalFlags = normalized;
    }

    if (contactNote !== undefined) {
      updateData.contactNote = typeof contactNote === 'string' ? contactNote : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      );
    }

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'Client',
        entityId: client.id,
        action: 'UPDATE',
      },
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Update client error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;

    const existingClient = await prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const appointmentCount = await prisma.appointment.count({
      where: { clientId: id },
    });

    if (appointmentCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with appointments' },
        { status: 409 }
      );
    }

    await prisma.client.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'Client',
        entityId: id,
        action: 'DELETE',
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete client error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}