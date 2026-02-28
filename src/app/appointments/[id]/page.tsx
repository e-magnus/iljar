'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { authFetch } from '@/lib/api/client';
import { formatDateTimeDDMMYYYYHHMM, formatIcelandicDayLabel, formatTimeHHMM } from '@/lib/format/date';

interface Visit {
  id: string;
  soapS: string | null;
  soapO: string | null;
  soapA: string | null;
  soapP: string | null;
  createdAt: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string | null;
  note: string | null;
  client: {
    id: string;
    name: string;
    phone: string;
    kennitala: string | null;
  };
  visits: Visit[];
}

function formatBookedService(appointment: Pick<Appointment, 'type' | 'startTime' | 'endTime'>): string {
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

function monthStart(date: Date): Date {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function formatAvailableHours(hours: number): string {
  const formatter = new Intl.NumberFormat('is-IS', {
    minimumFractionDigits: Number.isInteger(hours) ? 0 : 1,
    maximumFractionDigits: 1,
  });

  return `${formatter.format(hours)} klst`;
}

function availabilityTone(hours: number): {
  cell: string;
  text: string;
} {
  if (hours <= 1) {
    return {
      cell: 'border-rose-200 bg-rose-50 hover:border-rose-300',
      text: 'text-rose-700',
    };
  }

  if (hours <= 3) {
    return {
      cell: 'border-amber-200 bg-amber-50 hover:border-amber-300',
      text: 'text-amber-700',
    };
  }

  return {
    cell: 'border-emerald-200 bg-emerald-50 hover:border-emerald-300',
    text: 'text-emerald-700',
  };
}

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [showReschedulePanel, setShowReschedulePanel] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<TimeSlot[]>([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<TimeSlot | null>(null);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [loadingDayAvailability, setLoadingDayAvailability] = useState(false);
  const [dayAvailability, setDayAvailability] = useState<Record<string, number>>({});
  const [rescheduleVisibleMonth, setRescheduleVisibleMonth] = useState<Date>(() => monthStart(new Date()));

  const normalizePhone = (value: string) => value.replace(/\s+/g, '');
  const formatLocalDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const buildFollowUpUrl = () => {
    if (!appointment) {
      return '/booking';
    }

    const start = new Date(appointment.startTime);
    const followUp = new Date(start);
    followUp.setDate(followUp.getDate() + 14);

    const year = followUp.getFullYear();
    const month = String(followUp.getMonth() + 1).padStart(2, '0');
    const day = String(followUp.getDate()).padStart(2, '0');
    const hour = String(followUp.getHours()).padStart(2, '0');
    const minute = String(followUp.getMinutes()).padStart(2, '0');

    return `/booking?clientId=${encodeURIComponent(appointment.client.id)}&date=${year}-${month}-${day}&time=${hour}:${minute}`;
  };

  useEffect(() => {
    async function fetchAppointment() {
      try {
        const res = await authFetch(`/api/appointments/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setAppointment(data.appointment);
        }
      } catch (error) {
        console.error('Error fetching appointment:', error);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchAppointment();
    }
  }, [params.id]);

  useEffect(() => {
    if (!showReschedulePanel || !appointment) {
      return;
    }

    if (!rescheduleDate) {
      setRescheduleDate(appointment.startTime.slice(0, 10));
      setRescheduleVisibleMonth(monthStart(new Date(appointment.startTime)));
    }
  }, [showReschedulePanel, appointment, rescheduleDate]);

  useEffect(() => {
    if (!showReschedulePanel || !appointment) {
      setDayAvailability({});
      return;
    }

    const durationMinutes = Math.max(
      15,
      Math.round((new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) / 60000)
    );

    async function fetchDayAvailability() {
      setLoadingDayAvailability(true);
      try {
        const year = rescheduleVisibleMonth.getFullYear();
        const month = rescheduleVisibleMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dateList = Array.from({ length: daysInMonth }, (_, index) => {
          const date = new Date(year, month, index + 1);
          return formatLocalDateInput(date);
        });

        const responses = await Promise.all(
          dateList.map(async (date) => {
            const params = new URLSearchParams({
              date,
              slotLength: String(durationMinutes),
            });

            const response = await authFetch(`/api/slots?${params.toString()}`);
            if (!response.ok) {
              return { date, availableHours: 0 };
            }

            const data = await response.json();
            const slotCount = (data.slots ?? []).length;
            return { date, availableHours: (slotCount * durationMinutes) / 60 };
          })
        );

        const nextAvailability = responses.reduce<Record<string, number>>((accumulator, current) => {
          accumulator[current.date] = current.availableHours;
          return accumulator;
        }, {});

        setDayAvailability(nextAvailability);
      } catch (error) {
        console.error('Error fetching reschedule day availability:', error);
        setDayAvailability({});
      } finally {
        setLoadingDayAvailability(false);
      }
    }

    fetchDayAvailability();
  }, [showReschedulePanel, appointment, rescheduleVisibleMonth]);

  useEffect(() => {
    if (!showReschedulePanel || !appointment || !rescheduleDate) {
      setRescheduleSlots([]);
      return;
    }

    const durationMinutes = Math.max(
      15,
      Math.round((new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) / 60000)
    );

    async function fetchRescheduleSlots() {
      setLoadingRescheduleSlots(true);
      try {
        const params = new URLSearchParams({
          date: rescheduleDate,
          slotLength: String(durationMinutes),
        });

        const res = await authFetch(`/api/slots?${params.toString()}`);
        const data = await res.json().catch(() => null);
        const nextSlots: TimeSlot[] = data?.slots ?? [];
        setRescheduleSlots(nextSlots);
        setSelectedRescheduleSlot((current) => {
          if (!current) {
            return null;
          }

          return nextSlots.some((slot) => slot.start === current.start) ? current : null;
        });
      } catch (error) {
        console.error('Error fetching reschedule slots:', error);
        setRescheduleSlots([]);
        setSelectedRescheduleSlot(null);
      } finally {
        setLoadingRescheduleSlots(false);
      }
    }

    fetchRescheduleSlots();
  }, [showReschedulePanel, appointment, rescheduleDate]);

  const handleStartVisit = async () => {
    if (!appointment) {
      return;
    }

    try {
      if (appointment.status === 'BOOKED') {
        setSavingStatus(true);
        const res = await authFetch(`/api/appointments/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ARRIVED' }),
        });

        if (!res.ok) {
          alert('Ekki tókst að uppfæra stöðu tímans í mætt.');
          return;
        }

        const data = await res.json();
        setAppointment(data.appointment);
      }

      router.push(`/visits/new?appointmentId=${appointment.id}`);
    } catch (error) {
      console.error('Error starting visit:', error);
      alert('Villa við að opna heimsóknarskráningu.');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleMarkNoShow = async () => {
    if (!appointment) {
      return;
    }

    const confirmed = window.confirm('Merkja þennan tíma sem skróp?');
    if (!confirmed) {
      return;
    }

    try {
      setSavingStatus(true);
      const res = await authFetch(`/api/appointments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'NO_SHOW' }),
      });

      if (!res.ok) {
        alert('Ekki tókst að merkja skróp.');
        return;
      }

      const data = await res.json();
      setAppointment(data.appointment);

      const smsText = `Sæl/sæll ${appointment.client.name}. Tíminn þinn ${formatDate(appointment.startTime)} kl. ${formatTime(appointment.startTime)} var merktur sem skróp. Hafðu samband ef þú vilt bóka nýjan tíma.`;
      const notifyViaSms = window.confirm('Viltu opna SMS-drög til að láta skjólstæðing vita?');
      if (notifyViaSms) {
        window.location.href = `sms:${normalizePhone(appointment.client.phone)}?body=${encodeURIComponent(smsText)}`;
      }
    } catch (error) {
      console.error('Error marking no-show:', error);
      alert('Villa við að merkja skróp.');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleReschedule = () => {
    setShowReschedulePanel((current) => !current);
  };

  const handleConfirmReschedule = async () => {
    if (!appointment) {
      return;
    }

    if (!selectedRescheduleSlot) {
      alert('Veldu nýjan tíma áður en þú staðfestir færslu.');
      return;
    }

    try {
      setRescheduling(true);
      const res = await authFetch(`/api/appointments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'BOOKED',
          startTime: selectedRescheduleSlot.start,
          endTime: selectedRescheduleSlot.end,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Ekki tókst að færa tíma.' }));
        alert(data.error ?? 'Ekki tókst að færa tíma.');
        return;
      }

      const data = await res.json();
      setAppointment(data.appointment);
      setShowReschedulePanel(false);
      setSelectedRescheduleSlot(null);

      const smsText = `Sæl/sæll ${appointment.client.name}. Tímanum þínum var breytt í ${formatDate(selectedRescheduleSlot.start)} kl. ${formatTime(selectedRescheduleSlot.start)}.`;
      const notifyViaSms = window.confirm('Tími færður. Viltu opna SMS-drög til að láta skjólstæðing vita?');
      if (notifyViaSms) {
        window.location.href = `sms:${normalizePhone(appointment.client.phone)}?body=${encodeURIComponent(smsText)}`;
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      alert('Villa við að færa tíma.');
    } finally {
      setRescheduling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatIcelandicDayLabel(dateString);
  };

  const formatTime = (dateString: string) => {
    return formatTimeHHMM(dateString);
  };

  const formatDateTime = (dateString: string) => {
    return formatDateTimeDDMMYYYYHHMM(dateString);
  };

  const today = formatLocalDateInput(new Date());
  const rescheduleMonthLabel = new Intl.DateTimeFormat('is-IS', {
    month: 'long',
    year: 'numeric',
  }).format(rescheduleVisibleMonth);
  const firstWeekdayIndex = (rescheduleVisibleMonth.getDay() + 6) % 7;
  const visibleMonthDays = new Date(rescheduleVisibleMonth.getFullYear(), rescheduleVisibleMonth.getMonth() + 1, 0).getDate();
  const weekdayHeaders = ['Mán', 'Þri', 'Mið', 'Fim', 'Fös', 'Lau', 'Sun'];

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      BOOKED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Bókað' },
      ARRIVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Mætt' },
      COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Lokið' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Aflýst' },
      NO_SHOW: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Mætti ekki' },
    };

    const badge = badges[status] || badges.BOOKED;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Hleður...</div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Tími fannst ekki</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tímaviðburður</h1>
            <p className="text-sm text-gray-600">{formatDate(appointment.startTime)}</p>
          </div>
          <Button onClick={() => router.push('/')} variant="outline">
            Til baka
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-600">Skjólstæðingur</p>
                <p className="text-xl font-semibold text-gray-900">{appointment.client.name}</p>
                <p className="text-gray-700">{appointment.client.phone}</p>
                {appointment.client.kennitala && (
                  <p className="text-sm text-gray-600">Kt: {appointment.client.kennitala}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Appointment Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Upplýsingar um tíma</CardTitle>
                  {getStatusBadge(appointment.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Dagsetning og tími</p>
                    <p className="text-lg font-semibold">
                      {formatDate(appointment.startTime)}
                    </p>
                    <p className="text-lg text-blue-600">
                      {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tegund</p>
                    <p className="text-lg">{formatBookedService(appointment)}</p>
                  </div>
                  {appointment.note && (
                    <div>
                      <p className="text-sm text-gray-600">Athugasemd</p>
                      <p className="text-lg">{appointment.note}</p>
                    </div>
                  )}
                  <div className="pt-4 flex gap-3">
                    {(appointment.status === 'ARRIVED' || appointment.status === 'BOOKED') && (
                      <Button
                        onClick={handleStartVisit}
                        variant="primary"
                        disabled={savingStatus}
                      >
                        {savingStatus ? 'Opna...' : 'Skrá heimsókn'}
                      </Button>
                    )}
                    {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
                      <Button variant="outline" onClick={handleMarkNoShow} disabled={savingStatus}>
                        Merkja skróp
                      </Button>
                    )}
                    {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
                      <Button variant="outline" onClick={handleReschedule} disabled={rescheduling}>
                        {showReschedulePanel ? 'Loka færslu' : 'Færa tíma'}
                      </Button>
                    )}
                  </div>

                  {showReschedulePanel && appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="text-sm font-medium text-gray-900">Veldu nýjan dag og tíma</p>
                      <p className="mt-1 text-xs text-gray-600">Þjónusta og skjólstæðingur haldast óbreyttir.</p>

                      <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const previousMonth = new Date(rescheduleVisibleMonth);
                              previousMonth.setMonth(previousMonth.getMonth() - 1);
                              setRescheduleVisibleMonth(monthStart(previousMonth));
                            }}
                          >
                            ←
                          </Button>
                          <p className="text-sm font-semibold text-gray-700 capitalize">{rescheduleMonthLabel}</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const nextMonth = new Date(rescheduleVisibleMonth);
                              nextMonth.setMonth(nextMonth.getMonth() + 1);
                              setRescheduleVisibleMonth(monthStart(nextMonth));
                            }}
                          >
                            →
                          </Button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500">
                          {weekdayHeaders.map((weekday) => (
                            <div key={weekday} className="py-1">
                              {weekday}
                            </div>
                          ))}
                        </div>

                        {loadingDayAvailability ? (
                          <p className="text-sm text-gray-600">Sæki fjölda lausra klukkustunda...</p>
                        ) : (
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: firstWeekdayIndex }).map((_, index) => (
                              <div key={`reschedule-empty-${index}`} className="h-16 rounded-md" />
                            ))}

                            {Array.from({ length: visibleMonthDays }, (_, index) => {
                              const date = new Date(rescheduleVisibleMonth.getFullYear(), rescheduleVisibleMonth.getMonth(), index + 1);
                              const dateKey = formatLocalDateInput(date);
                              const isSelected = rescheduleDate === dateKey;
                              const availableHours = dayAvailability[dateKey] ?? 0;
                              const isPastDate = dateKey < today;
                              const isDisabled = isPastDate;
                              const tone = availabilityTone(availableHours);

                              return (
                                <button
                                  key={dateKey}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => {
                                    setRescheduleDate(dateKey);
                                    setSelectedRescheduleSlot(null);
                                  }}
                                  className={`h-16 rounded-lg border px-1 py-1 text-center transition-colors ${
                                    isSelected
                                      ? 'border-blue-600 bg-blue-50'
                                      : isDisabled
                                        ? 'border-gray-200 bg-gray-50 text-gray-400'
                                        : tone.cell
                                  }`}
                                >
                                  <p className="text-sm font-semibold">{index + 1}</p>
                                  <p className={`mt-0.5 text-[11px] ${availableHours > 0 ? tone.text : 'text-gray-400'}`}>
                                    {formatAvailableHours(availableHours)}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {rescheduleDate && (
                          <p className="mt-2 text-sm text-gray-600">Valinn dagur: {formatDate(`${rescheduleDate}T00:00:00`)}</p>
                        )}
                      </div>

                      <div className="mt-3">
                        <p className="mb-2 text-sm text-gray-700">Lausir tímar</p>
                        {loadingRescheduleSlots ? (
                          <p className="text-sm text-gray-600">Sæki lausa tíma...</p>
                        ) : rescheduleSlots.length === 0 ? (
                          <p className="text-sm text-gray-600">Engir lausir tímar fundust fyrir valinn dag.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {rescheduleSlots.map((slot) => (
                              <button
                                key={slot.start}
                                type="button"
                                onClick={() => setSelectedRescheduleSlot(slot)}
                                className={`rounded-lg border px-3 py-2 text-left ${selectedRescheduleSlot?.start === slot.start ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-900 hover:border-blue-400'}`}
                              >
                                <p className="font-semibold">{formatTime(slot.start)}</p>
                                <p className="text-xs">til {formatTime(slot.end)}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowReschedulePanel(false);
                            setSelectedRescheduleSlot(null);
                          }}
                          className="flex-1"
                        >
                          Hætta við
                        </Button>
                        <Button
                          type="button"
                          onClick={handleConfirmReschedule}
                          disabled={!selectedRescheduleSlot || rescheduling}
                          className="flex-1"
                        >
                          {rescheduling ? 'Færi...' : 'Staðfesta nýjan tíma'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Visits */}
            {appointment.visits && appointment.visits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Síðustu 3 heimsóknir</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {appointment.visits.map((visit) => (
                      <div key={visit.id} className="border-b pb-4 last:border-b-0">
                        <p className="text-sm text-gray-600 mb-2">
                          {formatDateTime(visit.createdAt)}
                        </p>
                        <div className="space-y-2 text-sm">
                          {visit.soapS && (
                            <div>
                              <span className="font-semibold">S (Subjective):</span> {visit.soapS}
                            </div>
                          )}
                          {visit.soapO && (
                            <div>
                              <span className="font-semibold">O (Objective):</span> {visit.soapO}
                            </div>
                          )}
                          {visit.soapA && (
                            <div>
                              <span className="font-semibold">A (Assessment):</span> {visit.soapA}
                            </div>
                          )}
                          {visit.soapP && (
                            <div>
                              <span className="font-semibold">P (Plan):</span> {visit.soapP}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Actions */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Aðgerðir</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <a
                    href={`tel:${normalizePhone(appointment.client.phone)}`}
                    className="inline-flex w-full items-center justify-center rounded-lg border-2 border-blue-600 px-4 py-2 text-blue-600 hover:bg-blue-50"
                  >
                    Hringja
                  </a>
                  <a
                    href={`sms:${normalizePhone(appointment.client.phone)}`}
                    className="inline-flex w-full items-center justify-center rounded-lg border-2 border-blue-600 px-4 py-2 text-blue-600 hover:bg-blue-50"
                  >
                    Senda SMS
                  </a>
                  <Button
                    onClick={() => router.push(`/clients/${appointment.client.id}`)}
                    variant="outline"
                    className="w-full"
                  >
                    Skoða sögu
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => router.push(buildFollowUpUrl())}>
                    Bóka eftirfylgni
                  </Button>
                  <div className="pt-2 text-xs text-gray-500">
                    Flýtileiðir fyrir næstu skref í móttöku og eftirfylgni.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
