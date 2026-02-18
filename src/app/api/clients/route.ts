import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { kennitala: { contains: search } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Get clients error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, kennitala } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'name and phone are required' },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        name,
        phone,
        kennitala,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'Client',
        entityId: client.id,
        action: 'CREATE',
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('Create client error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
