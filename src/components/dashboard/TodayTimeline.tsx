import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DashboardAppointment } from '@/components/dashboard/types';
import { authFetch } from '@/lib/api/client';

interface AvailableSlot {
  start: string;
  end: string;
}

interface TodayTimelineProps {
  selectedDate: string;
  appointments: DashboardAppointment[];
  onPreviousDay: () => void;
  onNextDay: () => void;
}

function formatTime(dateString: string): string {
  return new Intl.DateTimeFormat('is-IS', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(dateString));
}

function formatDayLabel(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00`);
  return new Intl.DateTimeFormat('is-IS', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
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
                        <p className="text-sm text-gray-600">Tegund komu: {appointment.type ?? 'Almenn meðferð'}</p>
                        <p className="text-xs text-gray-600">Sími: {appointment.client.phone}</p>
                        {appointment.client.contactPhone ? (
                          <p className="text-xs text-gray-600">Tengiliður: {appointment.client.contactPhone}</p>
                        ) : null}
                        <p className="text-xs text-gray-600">Staða: {appointment.status}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <p className="text-lg font-semibold text-gray-900">{formatTime(appointment.startTime)}</p>
                        <Link href={`/clients/${appointment.client.id}`}>
                          <Button
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
                          >
                            Opna
                          </Button>
                        </Link>
                        <Link href={`/appointments/${appointment.id}`}>
                          <Button size="sm" variant="outline">Breyta tíma</Button>
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
