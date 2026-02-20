import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';
import { generateSlots } from '@/lib/services/slots';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const weekOffsetRaw = request.nextUrl.searchParams.get('weekOffset');
    const parsedWeekOffset = Number.parseInt(weekOffsetRaw ?? '0', 10);
    const weekOffset = Number.isFinite(parsedWeekOffset)
      ? Math.max(-52, Math.min(52, parsedWeekOffset))
      : 0;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diffToMonday);
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const plus48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const [currentUser, nextAppointment, todayCount, unconfirmed48hCount, noShowToday, weekBooked, weekNoShow, settings, availabilityCount] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: auth.payload.userId },
          select: { email: true },
        }),
        prisma.appointment.findFirst({
          where: {
            startTime: { gte: now },
            status: { in: ['BOOKED', 'ARRIVED'] },
          },
          orderBy: { startTime: 'asc' },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        }),
        prisma.appointment.count({
          where: {
            startTime: { gte: todayStart, lte: todayEnd },
            status: { not: 'CANCELLED' },
          },
        }),
        prisma.appointment.count({
          where: {
            startTime: { gte: now, lte: plus48h },
            status: 'BOOKED',
          },
        }),
        prisma.appointment.count({
          where: {
            status: 'NO_SHOW',
            startTime: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.appointment.count({
          where: {
            startTime: { gte: weekStart, lte: weekEnd },
            status: { not: 'CANCELLED' },
          },
        }),
        prisma.appointment.count({
          where: {
            startTime: { gte: weekStart, lte: weekEnd },
            status: 'NO_SHOW',
          },
        }),
        prisma.settings.findFirst({
          select: { id: true },
        }),
        prisma.availabilityRule.count(),
      ]);

    const weekDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });

    const weeklySlots = await Promise.all(weekDates.map((date) => generateSlots({ date })));
    const weekFreeSlots = weeklySlots.flat().filter((slot) => {
      if (weekOffset < 0) {
        return false;
      }

      if (weekOffset === 0) {
        return slot.start >= now;
      }

      return true;
    }).length;

    const remindersConfigured = Boolean(process.env.REMINDER_PROVIDER || process.env.SMS_PROVIDER || process.env.EMAIL_PROVIDER);
    const servicesConfigured = Boolean(settings);
    const openingHoursConfigured = availabilityCount > 0;

    const setupChecklist = {
      services: servicesConfigured,
      openingHours: openingHoursConfigured,
      reminders: remindersConfigured,
      completed: [servicesConfigured, openingHoursConfigured, remindersConfigured].filter(Boolean).length,
      total: 3,
    };

    const alerts = [
      unconfirmed48hCount > 0
        ? {
            id: 'unconfirmed-48h',
            type: 'UNCONFIRMED',
            title: 'Óstaðfestir tímar',
            description: `${unconfirmed48hCount} tímar næstu 48 klst eru óstaðfestir.`,
            severity: 'medium',
          }
        : null,
      noShowToday > 0
        ? {
            id: 'no-show-today',
            type: 'NO_SHOW',
            title: 'Ekki mætt í dag',
            description: `${noShowToday} tímar voru merktir sem ekki mætt í dag.`,
            severity: 'high',
          }
        : null,
    ].filter(Boolean).slice(0, 3);

    return NextResponse.json({
      currentUser: {
        name: currentUser?.email?.split('@')[0] ?? 'Þórey Kristín Aðalsteinsdóttir',
        email: currentUser?.email ?? auth.payload.email ?? null,
      },
      nextAppointment,
      todayCount,
      alerts,
      metrics: {
        weekBooked,
        weekNoShow,
        weekFreeSlots,
      },
      week: {
        offset: weekOffset,
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      },
      setupChecklist,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    return NextResponse.json({ error: 'Óaðgengilegt' }, { status: 500 });
  }
}
