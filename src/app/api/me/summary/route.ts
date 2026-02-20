import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const plus48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [currentUser, nextAppointment, todayCount, unconfirmed48hCount, noShow30d, noShowToday, weekAppointments, settings, availabilityCount] =
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
            startTime: { gte: days30Ago },
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
        prisma.settings.findFirst({
          select: { id: true },
        }),
        prisma.availabilityRule.count(),
      ]);

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
        dailyRevenue: null,
        weekAppointments,
        noShow30d,
      },
      setupChecklist,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    return NextResponse.json({ error: 'Óaðgengilegt' }, { status: 500 });
  }
}
