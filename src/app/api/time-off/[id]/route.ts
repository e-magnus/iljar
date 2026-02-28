import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await params;

    const existing = await prisma.timeOff.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'TimeOff not found' }, { status: 404 });
    }

    await prisma.timeOff.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        entityType: 'TimeOff',
        entityId: id,
        action: 'DELETE',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete time off error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
