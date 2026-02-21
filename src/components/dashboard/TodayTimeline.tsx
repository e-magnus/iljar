import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DashboardAppointment, DashboardClinicalFlag } from '@/components/dashboard/types';
import { authFetch } from '@/lib/api/client';
import { formatIcelandicDayLabel, formatTimeHHMM } from '@/lib/format/date';

interface AvailableSlot {
  start: string;
  end: string;
}

interface SettingsFlag {
  label: string;
  icon: string;
}

interface SettingsFlagsResponse {
  clinical?: {
    customFlags?: SettingsFlag[];
  };
}

interface TodayTimelineProps {
  selectedDate: string;
  appointments: DashboardAppointment[];
  onPreviousDay: () => void;
  onNextDay: () => void;
}

const FLAGS_CONFIG_MARKER = '__FLAGS_CONFIGURED_V1__';

const defaultClinicalFlagMeta: Record<DashboardClinicalFlag, { label: string; icon: string }> = {
  ANTICOAGULANT: { label: 'Blóðþynning', icon: '🩸' },
  DIABETES: { label: 'Sykursýki', icon: '🧪' },
  ALLERGY: { label: 'Ofnæmi', icon: '⚠️' },
  NEUROPATHY: { label: 'Taugakvilli', icon: '🦶' },
  PACEMAKER: { label: 'Gangráður', icon: '❤️' },
  OTHER: { label: 'Annað', icon: 'ℹ️' },
};

function normalizeLabel(value: string): string {
  return value.trim().toLocaleLowerCase('is');
}

function resolveClinicalFlagMetaFromSettings(input: SettingsFlag[]): Record<DashboardClinicalFlag, { label: string; icon: string }> {
  const cleaned = input.filter((flag) => flag.label !== FLAGS_CONFIG_MARKER);
  if (cleaned.length === 0) {
    return defaultClinicalFlagMeta;
  }

  const next = { ...defaultClinicalFlagMeta };
  const assigned = new Set<DashboardClinicalFlag>();
  const entries = Object.entries(defaultClinicalFlagMeta) as Array<[DashboardClinicalFlag, { label: string; icon: string }]>;

  for (const flag of cleaned) {
    const normalized = normalizeLabel(flag.label);
    const byLabel = entries.find(([key, meta]) => !assigned.has(key) && normalizeLabel(meta.label) === normalized);
    if (byLabel) {
      next[byLabel[0]] = { label: flag.label, icon: flag.icon };
      assigned.add(byLabel[0]);
      continue;
    }

    const byIcon = entries.find(([key, meta]) => !assigned.has(key) && meta.icon === flag.icon);
    if (byIcon) {
      next[byIcon[0]] = { label: flag.label, icon: flag.icon };
      assigned.add(byIcon[0]);
    }
  }

  return next;
}

function formatTime(dateString: string): string {
  return formatTimeHHMM(dateString);
}

function formatDayLabel(dateIso: string): string {
  return formatIcelandicDayLabel(`${dateIso}T00:00:00`);
}

function formatBookedService(appointment: DashboardAppointment): string {
  const serviceName = appointment.type ?? 'Almenn meðferð';
  const durationMinutes = Math.max(
    0,
    Math.round((new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) / 60000)
  );

  if (durationMinutes <= 0) {
    return serviceName;
  }

  return `${serviceName} (${durationMinutes} mín)`;
}

function isToday(dateIso: string): boolean {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${now.getFullYear()}-${month}-${day}`;
  return dateIso === today;
}

export function TodayTimeline({ selectedDate, appointments, onPreviousDay, onNextDay }: TodayTimelineProps) {
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [clinicalFlagMeta, setClinicalFlagMeta] = useState(defaultClinicalFlagMeta);
  const [customFlagIconByLabel, setCustomFlagIconByLabel] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const res = await authFetch(`/api/slots?date=${selectedDate}`);
        if (!res.ok) {
          setAvailableSlots([]);
          return;
        }

        const data = await res.json();
        setAvailableSlots(data.slots ?? []);
      } catch (error) {
        console.error('Error fetching available slots:', error);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [selectedDate]);

  useEffect(() => {
    async function fetchFlagMeta() {
      try {
        const res = await authFetch('/api/settings');
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as SettingsFlagsResponse;
        const settingsFlags = data.clinical?.customFlags ?? [];
        setClinicalFlagMeta(resolveClinicalFlagMetaFromSettings(settingsFlags));
        const iconMap = settingsFlags
          .filter((flag) => flag.label !== FLAGS_CONFIG_MARKER)
          .reduce<Record<string, string>>((accumulator, flag) => {
            accumulator[normalizeLabel(flag.label)] = flag.icon;
            return accumulator;
          }, {});
        setCustomFlagIconByLabel(iconMap);
      } catch {
        setClinicalFlagMeta(defaultClinicalFlagMeta);
        setCustomFlagIconByLabel({});
      }
    }

    fetchFlagMeta();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{isToday(selectedDate) ? 'Í dag' : formatDayLabel(selectedDate)}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onPreviousDay}>←</Button>
            <Button size="sm" variant="outline" onClick={onNextDay}>→</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Bókaðir tímar</p>
            {appointments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
                <p className="text-gray-600">Engir bókaðir tímar þennan dag.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {appointments.map((appointment) => (
                  <li key={appointment.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">{appointment.client.name}</p>
                        {((appointment.client.clinicalFlags?.length ?? 0) > 0 || (appointment.client.customClinicalFlags?.length ?? 0) > 0) ? (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {[
                              ...(appointment.client.clinicalFlags ?? []).map((flag) => ({
                                key: `clinical-${flag}`,
                                label: clinicalFlagMeta[flag].label,
                                icon: clinicalFlagMeta[flag].icon,
                              })),
                              ...(appointment.client.customClinicalFlags ?? []).map((label) => ({
                                key: `custom-${label}`,
                                label,
                                icon: customFlagIconByLabel[normalizeLabel(label)] ?? 'ℹ️',
                              })),
                            ].slice(0, 4).map((flag) => (
                              <span
                                key={`${appointment.id}-${flag.key}`}
                                title={`${flag.icon} ${flag.label}`}
                                aria-label={`${flag.icon} ${flag.label}`}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-[10px]"
                              >
                                {flag.icon}
                              </span>
                            ))}
                            {((appointment.client.clinicalFlags?.length ?? 0) + (appointment.client.customClinicalFlags?.length ?? 0)) > 4 ? (
                              <span
                                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-gray-300 bg-white px-1 text-[10px] text-gray-600"
                                title={`Aðrir áhættuþættir: ${(appointment.client.clinicalFlags?.length ?? 0) + (appointment.client.customClinicalFlags?.length ?? 0) - 4}`}
                              >
                                +{(appointment.client.clinicalFlags?.length ?? 0) + (appointment.client.customClinicalFlags?.length ?? 0) - 4}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        <p className="text-sm text-gray-600">{formatBookedService(appointment)}</p>
                        <p className="text-xs text-gray-600">Sími: {appointment.client.phone}</p>
                        {appointment.client.contactPhone ? (
                          <p className="text-xs text-gray-600">Tengiliður: {appointment.client.contactPhone}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <p className="text-lg font-semibold text-gray-900">{formatTime(appointment.startTime)}</p>
                        <Link href={`/clients/${appointment.client.id}`}>
                          <Button
                            size="sm"
                            className="w-24 justify-center bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
                          >
                            Opna
                          </Button>
                        </Link>
                        <Link href={`/appointments/${appointment.id}`}>
                          <Button size="sm" variant="outline" className="w-24 justify-center">Breyta</Button>
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Lausir tímar</p>
            {loadingSlots ? (
              <p className="text-sm text-gray-600">Hleður lausum tímum...</p>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-gray-600">Engir lausir tímar samkvæmt vinnuskipulagi.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {availableSlots.map((slot) => (
                  <li key={slot.start} className="rounded-lg border border-dashed border-gray-300 bg-white px-2 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800">{formatTime(slot.start)}</p>
                      <Link
                        href={`/booking?date=${encodeURIComponent(selectedDate)}&start=${encodeURIComponent(slot.start)}&end=${encodeURIComponent(slot.end)}`}
                        aria-label={`Bæta við bókun kl. ${formatTime(slot.start)}`}
                      >
                        <Button size="sm" variant="outline" className="h-7 w-7 px-0">+</Button>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
