import { NextRequest, NextResponse } from 'next/server';
import { generateSlots, findNextAvailableSlot } from '@/lib/services/slots';
import { requireAuth } from '@/lib/auth/guard';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const nextOnly = searchParams.get('next') === 'true';

    if (nextOnly) {
      // Find next available slot
      const slot = await findNextAvailableSlot();
      
      if (!slot) {
        return NextResponse.json(
          { error: 'No available slots found in the next 30 days' },
          { status: 404 }
        );
      }

      return NextResponse.json({ slot });
    }

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    const slots = await generateSlots({ date });

    return NextResponse.json({ slots });
  } catch (error) {
    console.error('Slots error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
