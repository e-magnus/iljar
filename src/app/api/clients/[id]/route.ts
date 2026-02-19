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
    const { name, phone, kennitala } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'name and phone are required' },
        { status: 400 }
      );
    }

    const existingClient = await prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name,
        phone,
        kennitala,
      },
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