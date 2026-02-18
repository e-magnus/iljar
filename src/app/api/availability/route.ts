import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const rules = await prisma.availabilityRule.findMany({
      orderBy: { weekday: 'asc' },
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Get availability rules error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { weekday, startTime, endTime, effectiveFrom, effectiveTo } = body;

    if (weekday === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'weekday, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    // Validate weekday
    if (weekday < 0 || weekday > 6) {
      return NextResponse.json(
        { error: 'weekday must be between 0 (Sunday) and 6 (Saturday)' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: 'Time must be in HH:MM format' },
        { status: 400 }
      );
    }

    const rule = await prisma.availabilityRule.create({
      data: {
        weekday,
        startTime,
        endTime,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('Create availability rule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
