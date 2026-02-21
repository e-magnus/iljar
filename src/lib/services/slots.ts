import { prisma } from '@/lib/db/prisma';
import { isIcelandicPublicHoliday } from '@/lib/services/icelandicHolidays';

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface SlotGeneratorOptions {
  date: Date;
  slotLength?: number;
  bufferTime?: number;
}

/**
 * Generate available time slots for a given date
 * Takes into account:
 * - Availability rules (working hours)
 * - Existing appointments
 * - Time off periods
 * - Buffer time between appointments
 */
export async function generateSlots(options: SlotGeneratorOptions): Promise<TimeSlot[]> {
  const { date, slotLength, bufferTime } = options;

  // Get settings from database if not provided
  const settings = await prisma.settings.findFirst();
  const actualSlotLength = slotLength ?? settings?.slotLength ?? 30;
  const actualBufferTime = bufferTime ?? settings?.bufferTime ?? 5;

  if (settings?.blockRedDays && isIcelandicPublicHoliday(date)) {
    return [];
  }

  // Get day of week (0 = Sunday, 6 = Saturday)
  const weekday = date.getDay();

  // Get availability rules for this weekday
  const availabilityRules = await prisma.availabilityRule.findMany({
    where: {
      weekday,
      OR: [
        { effectiveFrom: null, effectiveTo: null },
        {
          AND: [
            { effectiveFrom: { lte: date } },
            { OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }] },
          ],
        },
      ],
    },
  });

  if (availabilityRules.length === 0) {
    return []; // No working hours defined for this day
  }

  // Check if date is in a time-off period
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const timeOffs = await prisma.timeOff.findMany({
    where: {
      OR: [
        {
          AND: [
            { startDatetime: { lte: endOfDay } },
            { endDatetime: { gte: startOfDay } },
          ],
        },
      ],
    },
  });

  if (timeOffs.length > 0) {
    return []; // Day is blocked by time off
  }

  // Get existing appointments for this day
  const appointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: startOfDay },
      endTime: { lte: endOfDay },
      status: {
        not: 'CANCELLED',
      },
    },
    orderBy: { startTime: 'asc' },
  });

  // Generate all possible slots
  const allSlots: TimeSlot[] = [];

  for (const rule of availabilityRules) {
    const [startHour, startMinute] = rule.startTime.split(':').map(Number);
    const [endHour, endMinute] = rule.endTime.split(':').map(Number);

    const slotStart = new Date(date);
    slotStart.setHours(startHour, startMinute, 0, 0);

    const ruleEnd = new Date(date);
    ruleEnd.setHours(endHour, endMinute, 0, 0);

    while (slotStart < ruleEnd) {
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + actualSlotLength);

      if (slotEnd <= ruleEnd) {
        allSlots.push({
          start: new Date(slotStart),
          end: new Date(slotEnd),
        });
      }

      // Move to next slot (including buffer time)
      slotStart.setMinutes(slotStart.getMinutes() + actualSlotLength + actualBufferTime);
    }
  }

  // Filter out slots that overlap with existing appointments
  const availableSlots = allSlots.filter((slot) => {
    return !appointments.some((appointment) => {
      // Check if slot overlaps with appointment (including buffer)
      const appointmentStart = new Date(appointment.startTime);
      appointmentStart.setMinutes(appointmentStart.getMinutes() - actualBufferTime);
      const appointmentEnd = new Date(appointment.endTime);
      appointmentEnd.setMinutes(appointmentEnd.getMinutes() + actualBufferTime);

      return (
        (slot.start >= appointmentStart && slot.start < appointmentEnd) ||
        (slot.end > appointmentStart && slot.end <= appointmentEnd) ||
        (slot.start <= appointmentStart && slot.end >= appointmentEnd)
      );
    });
  });

  return availableSlots;
}

/**
 * Find the next available slot starting from now
 */
export async function findNextAvailableSlot(): Promise<TimeSlot | null> {
  const now = new Date();
  const maxDaysToCheck = 30; // Look up to 30 days ahead

  for (let i = 0; i < maxDaysToCheck; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + i);

    const slots = await generateSlots({ date: checkDate });

    // Filter slots that are in the future
    const futureSlots = slots.filter((slot) => slot.start > now);

    if (futureSlots.length > 0) {
      return futureSlots[0];
    }
  }

  return null;
}
