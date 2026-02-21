import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/guard';

type WorkingHoursInput = {
  weekday: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type CustomClinicalFlag = {
  label: string;
  icon: string;
};

const allowedClinicalFlagIcons = ['🩸', '🧪', '⚠️', '🦶', '❤️', 'ℹ️', '🫀', '🫁', '🦴', '💊', '🩹', '🧬'] as const;

function validateBookingInput(slotLength: unknown, bufferTime: unknown) {
  if (!Number.isInteger(slotLength) || !Number.isInteger(bufferTime)) {
    return { valid: false, error: 'slotLength and bufferTime must be integers' };
  }

  if ((slotLength as number) < 5 || (slotLength as number) > 180) {
    return { valid: false, error: 'slotLength must be between 5 and 180 minutes' };
  }

  if ((bufferTime as number) < 0 || (bufferTime as number) > 60) {
    return { valid: false, error: 'bufferTime must be between 0 and 60 minutes' };
  }

  return { valid: true };
}

function validateTimeFormat(value: string) {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(value);
}

function validateWorkingHoursInput(workingHours: unknown) {
  if (!Array.isArray(workingHours) || workingHours.length !== 7) {
    return { valid: false, error: 'workingHours must contain exactly 7 weekday entries' };
  }

  const seen = new Set<number>();
  for (const entry of workingHours) {
    const item = entry as WorkingHoursInput;
    if (
      typeof item?.weekday !== 'number' ||
      item.weekday < 0 ||
      item.weekday > 6 ||
      typeof item?.enabled !== 'boolean' ||
      typeof item?.startTime !== 'string' ||
      typeof item?.endTime !== 'string'
    ) {
      return { valid: false, error: 'Invalid workingHours entry' };
    }

    if (seen.has(item.weekday)) {
      return { valid: false, error: 'Each weekday must appear once' };
    }

    seen.add(item.weekday);

    if (!validateTimeFormat(item.startTime) || !validateTimeFormat(item.endTime)) {
      return { valid: false, error: 'Working hour times must be HH:MM format' };
    }

    if (item.enabled && item.startTime >= item.endTime) {
      return { valid: false, error: 'startTime must be earlier than endTime for enabled days' };
    }
  }

  return { valid: true };
}

function normalizeCustomFlagLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeCustomFlags(input: CustomClinicalFlag[]): CustomClinicalFlag[] {
  const deduped = new Map<string, CustomClinicalFlag>();

  for (const item of input) {
    const label = normalizeCustomFlagLabel(item.label);
    if (!label) {
      continue;
    }

    const key = label.toLocaleLowerCase('is');
    if (!deduped.has(key)) {
      deduped.set(key, {
        label,
        icon: item.icon,
      });
    }
  }

  return Array.from(deduped.values()).sort((a, b) => a.label.localeCompare(b.label, 'is'));
}

function validateCustomFlagsInput(customFlags: unknown) {
  if (!Array.isArray(customFlags)) {
    return { valid: false, error: 'customFlags must be an array' };
  }

  const parsed: CustomClinicalFlag[] = [];

  for (const value of customFlags) {
    if (typeof value === 'string') {
      parsed.push({ label: value, icon: 'ℹ️' });
      continue;
    }

    const item = value as { label?: unknown; icon?: unknown };
    if (typeof item?.label !== 'string') {
      return { valid: false, error: 'Each custom flag must contain a label' };
    }

    if (typeof item?.icon !== 'string') {
      return { valid: false, error: 'Each custom flag must contain an icon' };
    }

    if (!allowedClinicalFlagIcons.includes(item.icon as (typeof allowedClinicalFlagIcons)[number])) {
      return { valid: false, error: 'Invalid custom flag icon' };
    }

    parsed.push({ label: item.label, icon: item.icon });
  }

  const normalized = normalizeCustomFlags(parsed);

  if (normalized.some((item) => item.label.length < 2 || item.label.length > 40)) {
    return { valid: false, error: 'Each custom flag must be between 2 and 40 characters' };
  }

  if (normalized.length > 40) {
    return { valid: false, error: 'Maximum 40 custom flags allowed' };
  }

  return { valid: true, normalized };
}

function parseStoredCustomFlags(customFlags: Prisma.JsonValue | null | undefined): CustomClinicalFlag[] {
  if (!Array.isArray(customFlags)) {
    return [];
  }

  const parsed: CustomClinicalFlag[] = [];
  for (const value of customFlags) {
    if (typeof value === 'string') {
      parsed.push({ label: value, icon: 'ℹ️' });
      continue;
    }

    const item = value as { label?: unknown; icon?: unknown };
    if (typeof item?.label !== 'string') {
      continue;
    }

    const icon = typeof item.icon === 'string' && allowedClinicalFlagIcons.includes(item.icon as (typeof allowedClinicalFlagIcons)[number])
      ? item.icon
      : 'ℹ️';

    parsed.push({ label: item.label, icon });
  }

  return normalizeCustomFlags(parsed);
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const [user, settings, defaultRules] = await Promise.all([
      prisma.user.findUnique({
        where: { id: auth.payload.userId },
        select: { totpEnabled: true },
      }),
      prisma.settings.findFirst({
        select: {
          slotLength: true,
          bufferTime: true,
          blockRedDays: true,
          customClinicalFlags: true,
          updatedAt: true,
        },
      }),
      prisma.availabilityRule.findMany({
        where: {
          effectiveFrom: null,
          effectiveTo: null,
        },
        orderBy: { weekday: 'asc' },
      }),
    ]);

    const defaultRuleByWeekday = new Map(defaultRules.map((rule) => [rule.weekday, rule]));
    const workingHours = Array.from({ length: 7 }, (_, weekday) => {
      const rule = defaultRuleByWeekday.get(weekday);
      return {
        weekday,
        enabled: Boolean(rule),
        startTime: rule?.startTime ?? '09:00',
        endTime: rule?.endTime ?? '17:00',
      };
    });

    const remindersConfigured = Boolean(
      process.env.REMINDER_PROVIDER || process.env.SMS_PROVIDER || process.env.EMAIL_PROVIDER
    );

    return NextResponse.json({
      security: {
        totpEnabled: user?.totpEnabled ?? false,
      },
      booking: {
        slotLength: settings?.slotLength ?? 30,
        bufferTime: settings?.bufferTime ?? 5,
      },
      scheduling: {
        blockRedDays: settings?.blockRedDays ?? false,
        workingHours,
      },
      clinical: {
        customFlags: parseStoredCustomFlags(settings?.customClinicalFlags),
      },
      notifications: {
        remindersConfigured,
      },
      updatedAt: settings?.updatedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const booking = body?.booking;
    const scheduling = body?.scheduling;
    const clinical = body?.clinical;
    const workingHours = scheduling?.workingHours;
    const customFlags = clinical?.customFlags;

    if (!booking && !scheduling && !clinical) {
      return NextResponse.json(
        { error: 'At least one of booking, scheduling, or clinical payload is required' },
        { status: 400 }
      );
    }

    if (booking) {
      const bookingValidation = validateBookingInput(booking.slotLength, booking.bufferTime);
      if (!bookingValidation.valid) {
        return NextResponse.json({ error: bookingValidation.error }, { status: 400 });
      }
    }

    if (scheduling && scheduling.blockRedDays !== undefined && typeof scheduling.blockRedDays !== 'boolean') {
      return NextResponse.json({ error: 'blockRedDays must be a boolean' }, { status: 400 });
    }

    if (workingHours !== undefined) {
      const workingHoursValidation = validateWorkingHoursInput(workingHours);
      if (!workingHoursValidation.valid) {
        return NextResponse.json({ error: workingHoursValidation.error }, { status: 400 });
      }
    }

    let normalizedCustomFlags: CustomClinicalFlag[] | undefined;
    if (customFlags !== undefined) {
      const customFlagsValidation = validateCustomFlagsInput(customFlags);
      if (!customFlagsValidation.valid) {
        return NextResponse.json({ error: customFlagsValidation.error }, { status: 400 });
      }

      normalizedCustomFlags = customFlagsValidation.normalized;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.settings.findFirst({
        select: { id: true },
      });

      const settingsRecord = existing
        ? await tx.settings.update({
            where: { id: existing.id },
            data: {
              ...(booking
                ? {
                    slotLength: booking.slotLength,
                    bufferTime: booking.bufferTime,
                  }
                : {}),
              ...(scheduling && scheduling.blockRedDays !== undefined
                ? { blockRedDays: scheduling.blockRedDays }
                : {}),
              ...(normalizedCustomFlags !== undefined
                ? { customClinicalFlags: normalizedCustomFlags }
                : {}),
            },
            select: {
              slotLength: true,
              bufferTime: true,
              blockRedDays: true,
              customClinicalFlags: true,
              updatedAt: true,
            },
          })
        : await tx.settings.create({
            data: {
              slotLength: booking?.slotLength ?? 30,
              bufferTime: booking?.bufferTime ?? 5,
              blockRedDays: scheduling?.blockRedDays ?? false,
              customClinicalFlags: normalizedCustomFlags ?? [],
            },
            select: {
              slotLength: true,
              bufferTime: true,
              blockRedDays: true,
              customClinicalFlags: true,
              updatedAt: true,
            },
          });

      if (workingHours) {
        await tx.availabilityRule.deleteMany({
          where: {
            effectiveFrom: null,
            effectiveTo: null,
          },
        });

        const enabledRules = (workingHours as WorkingHoursInput[])
          .filter((item) => item.enabled)
          .map((item) => ({
            weekday: item.weekday,
            startTime: item.startTime,
            endTime: item.endTime,
            effectiveFrom: null,
            effectiveTo: null,
          }));

        if (enabledRules.length > 0) {
          await tx.availabilityRule.createMany({
            data: enabledRules,
          });
        }
      }

      const latestRules = await tx.availabilityRule.findMany({
        where: {
          effectiveFrom: null,
          effectiveTo: null,
        },
        orderBy: { weekday: 'asc' },
      });

      return { settingsRecord, latestRules };
    });

    const ruleByWeekday = new Map(updated.latestRules.map((rule) => [rule.weekday, rule]));
    const resolvedWorkingHours = Array.from({ length: 7 }, (_, weekday) => {
      const rule = ruleByWeekday.get(weekday);
      return {
        weekday,
        enabled: Boolean(rule),
        startTime: rule?.startTime ?? '09:00',
        endTime: rule?.endTime ?? '17:00',
      };
    });

    return NextResponse.json({
      booking: {
        slotLength: updated.settingsRecord.slotLength,
        bufferTime: updated.settingsRecord.bufferTime,
      },
      scheduling: {
        blockRedDays: updated.settingsRecord.blockRedDays,
        workingHours: resolvedWorkingHours,
      },
      clinical: {
        customFlags: parseStoredCustomFlags(updated.settingsRecord.customClinicalFlags),
      },
      updatedAt: updated.settingsRecord.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Patch settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}