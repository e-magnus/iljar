'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PulseMetrics } from '@/components/dashboard/PulseMetrics';
import { authFetch } from '@/lib/api/client';
import { formatDDMM, formatDDMMYY, formatDDMMYYYY, formatIcelandicDayLabel, formatIcelandicDayLabelShort, formatTimeHHMM } from '@/lib/format/date';

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string | null;
  client: {
    id: string;
    name: string;
  };
}

interface WeekMetrics {
  weekBooked: number;
  weekNoShow: number;
  weekFreeSlots: number;
}

interface WorkingHour {
  weekday: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getWeekStart(date: Date): Date {
  const value = startOfDay(date);
  const day = value.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diffToMonday);
  return value;
}

function formatShortDate(dateString: string): string {
  return formatDDMMYY(dateString);
}

function getIsoWeekNumber(dateString: string): number {
  const date = new Date(dateString);
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekLabel(week: { offset: number; start: string; end: string }): string {
  const range = `(${formatShortDate(week.start)} - ${formatShortDate(week.end)})`;

  if (week.offset === 0) return `Þessi vika ${range}`;
  if (week.offset === 1) return `Næsta vika ${range}`;
  if (week.offset === 2) return `Þar næsta vika ${range}`;
  if (week.offset === -1) return `Síðasta vika ${range}`;
  if (week.offset === -2) return `Þar síðasta vika ${range}`;

  const isoWeek = getIsoWeekNumber(week.start);
  return `Vika ${String(isoWeek).padStart(2, '0')} ${range}`;
}

function getWeekOffsetFromDate(selectedWeekStart: Date): number {
  const currentWeekStart = getWeekStart(new Date());
  const ms = selectedWeekStart.getTime() - currentWeekStart.getTime();
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
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

export default function AppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<string | null>(null);
  const [movingAppointmentId, setMovingAppointmentId] = useState<string | null>(null);
  const [touchDraggingAppointmentId, setTouchDraggingAppointmentId] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [weekLabel, setWeekLabel] = useState<string>('Þessi vika');
  const [weekMetrics, setWeekMetrics] = useState<WeekMetrics>({
    weekBooked: 0,
    weekNoShow: 0,
    weekFreeSlots: 0,
  });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const res = await authFetch('/api/appointments');
        const data = await res.json();
        setAppointments(data.appointments ?? []);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, []);

  useEffect(() => {
    async function fetchWorkingHours() {
      try {
        const response = await authFetch('/api/settings');
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setWorkingHours(data.scheduling?.workingHours ?? []);
      } catch (error) {
        console.error('Error fetching working hours:', error);
      }
    }

    fetchWorkingHours();
  }, []);

  useEffect(() => {
    async function fetchWeekSummary() {
      try {
        const weekOffset = getWeekOffsetFromDate(weekStart);
        const res = await authFetch(`/api/me/summary?weekOffset=${weekOffset}`);
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        setWeekLabel(getWeekLabel(data.week));
        setWeekMetrics({
          weekBooked: data.metrics?.weekBooked ?? 0,
          weekNoShow: data.metrics?.weekNoShow ?? 0,
          weekFreeSlots: data.metrics?.weekFreeSlots ?? 0,
        });
      } catch (error) {
        console.error('Error fetching week summary:', error);
      }
    }

    fetchWeekSummary();
  }, [weekStart]);

  const slotMinutes = 30;
  const rowHeight = 44;

  const allActiveAppointments = appointments
    .filter((appointment) => {
      return appointment.status !== 'CANCELLED';
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  const daysToRender = viewMode === 'day' ? [selectedDay] : weekDays;

  const rangeStart = startOfDay(daysToRender[0]);
  const rangeEnd = startOfDay(daysToRender[daysToRender.length - 1]);
  rangeEnd.setDate(rangeEnd.getDate() + 1);

  const visibleAppointments = allActiveAppointments.filter((appointment) => {
    const start = new Date(appointment.startTime);
    return start >= rangeStart && start < rangeEnd;
  });

  let startMinutes = 8 * 60;
  let endMinutes = 18 * 60;
  if (visibleAppointments.length > 0) {
    const minimumStart = Math.min(...visibleAppointments.map((item) => {
      const value = new Date(item.startTime);
      return value.getHours() * 60 + value.getMinutes();
    }));

    const maximumEnd = Math.max(...visibleAppointments.map((item) => {
      const value = new Date(item.endTime);
      return value.getHours() * 60 + value.getMinutes();
    }));

    startMinutes = Math.max(Math.floor(minimumStart / slotMinutes) * slotMinutes - slotMinutes, 6 * 60);
    endMinutes = Math.min(Math.ceil(maximumEnd / slotMinutes) * slotMinutes + slotMinutes, 22 * 60);
  }

  const rowsPerDay = (endMinutes - startMinutes) / slotMinutes;
  const gridHeight = rowsPerDay * rowHeight;

  const appointmentsByDay = daysToRender.map((date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return visibleAppointments.filter((appointment) => {
      const start = new Date(appointment.startTime);
      return start >= dayStart && start <= dayEnd;
    });
  });

  const timeRows = Array.from({ length: rowsPerDay + 1 }, (_, index) => {
    const totalMinutes = startMinutes + index * slotMinutes;
    const hours = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (totalMinutes % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  });

  const formatWeekLabel = () => {
    const start = formatDDMM(weekStart);

    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + 6);
    const end = formatDDMMYYYY(endDate);

    return `${start} - ${end}`;
  };

  const formatSelectedDayLabel = () => {
    return formatIcelandicDayLabel(selectedDay);
  };

  const formatDayLabel = (date: Date) => {
    return formatIcelandicDayLabelShort(date);
  };

  const formatTime = (dateString: string) => {
    return formatTimeHHMM(dateString);
  };

  const formatDate = (date: Date) => {
    return formatDDMMYYYY(date);
  };

  const toDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toTimeLabel = (minutes: number) => {
    const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mins = String(minutes % 60).padStart(2, '0');
    return `${hours}:${mins}`;
  };

  const getEventPosition = (appointment: Appointment) => {
    const start = new Date(appointment.startTime);
    const end = new Date(appointment.endTime);
    const appointmentStartMinutes = start.getHours() * 60 + start.getMinutes();
    const appointmentEndMinutes = end.getHours() * 60 + end.getMinutes();
    const fromGridStart = appointmentStartMinutes - startMinutes;
    const durationMinutes = Math.max(appointmentEndMinutes - appointmentStartMinutes, slotMinutes);

    const top = Math.max((fromGridStart / slotMinutes) * rowHeight, 0);
    const height = Math.max((durationMinutes / slotMinutes) * rowHeight - 4, rowHeight - 6);

    return {
      top,
      height,
    };
  };

  const previousRange = () => {
    if (viewMode === 'day') {
      const previous = new Date(selectedDay);
      previous.setDate(previous.getDate() - 1);
      setSelectedDay(startOfDay(previous));
      setWeekStart(getWeekStart(previous));
      return;
    }

    const previous = new Date(weekStart);
    previous.setDate(previous.getDate() - 7);
    setWeekStart(previous);
  };

  const shiftWeek = (delta: number) => {
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + delta * 7);
    setWeekStart(nextWeekStart);

    if (viewMode === 'day') {
      const dayInWeek = selectedDay.getDay();
      const offsetFromMonday = dayInWeek === 0 ? 6 : dayInWeek - 1;
      const nextSelectedDay = new Date(nextWeekStart);
      nextSelectedDay.setDate(nextSelectedDay.getDate() + offsetFromMonday);
      setSelectedDay(startOfDay(nextSelectedDay));
    }
  };

  const nextRange = () => {
    if (viewMode === 'day') {
      const next = new Date(selectedDay);
      next.setDate(next.getDate() + 1);
      setSelectedDay(startOfDay(next));
      setWeekStart(getWeekStart(next));
      return;
    }

    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const goToToday = () => {
    const today = startOfDay(new Date());
    setSelectedDay(today);
    setWeekStart(getWeekStart(today));
  };

  const getSnappedMinutesFromPointer = (container: HTMLDivElement, clientY: number) => {
    const rect = container.getBoundingClientRect();
    const relativeY = Math.max(0, Math.min(clientY - rect.top, gridHeight - 1));
    const rowIndex = Math.floor(relativeY / rowHeight);
    return startMinutes + rowIndex * slotMinutes;
  };

  const getWorkingHoursForDay = (day: Date) => {
    return workingHours.find((item) => item.weekday === day.getDay());
  };

  const isMinuteBlocked = (day: Date, minute: number) => {
    const rule = getWorkingHoursForDay(day);
    if (!rule || !rule.enabled) {
      return true;
    }

    const dayStartMinute = parseTimeToMinutes(rule.startTime);
    const dayEndMinute = parseTimeToMinutes(rule.endTime);
    return minute < dayStartMinute || minute >= dayEndMinute;
  };

  const getBlockedSegments = (day: Date) => {
    const rule = getWorkingHoursForDay(day);

    if (!rule || !rule.enabled) {
      return [{ top: 0, height: gridHeight }];
    }

    const dayStartMinute = parseTimeToMinutes(rule.startTime);
    const dayEndMinute = parseTimeToMinutes(rule.endTime);

    const startTop = Math.max(((Math.min(dayStartMinute, endMinutes) - startMinutes) / slotMinutes) * rowHeight, 0);
    const endTop = Math.max(((Math.min(dayEndMinute, endMinutes) - startMinutes) / slotMinutes) * rowHeight, 0);

    const segments: { top: number; height: number }[] = [];
    if (dayStartMinute > startMinutes) {
      segments.push({ top: 0, height: Math.min(startTop, gridHeight) });
    }

    if (dayEndMinute < endMinutes) {
      segments.push({ top: Math.max(endTop, 0), height: Math.max(gridHeight - endTop, 0) });
    }

    return segments;
  };

  const onColumnClick = (day: Date, event: React.MouseEvent<HTMLDivElement>) => {
    if (touchDraggingAppointmentId) {
      return;
    }

    const container = event.currentTarget;
    const targetMinutes = getSnappedMinutesFromPointer(container, event.clientY);
    if (isMinuteBlocked(day, targetMinutes)) {
      return;
    }
    const targetDate = toDateInputValue(day);
    const targetTime = toTimeLabel(targetMinutes);
    router.push(`/booking?date=${targetDate}&time=${targetTime}`);
  };

  const moveAppointmentToSlot = async (appointmentId: string, day: Date, targetMinutes: number) => {
    if (isMinuteBlocked(day, targetMinutes)) {
      return;
    }

    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment) {
      return;
    }

    const targetStart = new Date(day);
    targetStart.setHours(Math.floor(targetMinutes / 60), targetMinutes % 60, 0, 0);

    const originalStart = new Date(appointment.startTime);
    const originalEnd = new Date(appointment.endTime);
    const durationMs = originalEnd.getTime() - originalStart.getTime();
    const targetEnd = new Date(targetStart.getTime() + durationMs);

    const confirmed = window.confirm(
      `Færa tíma fyrir ${appointment.client.name} í ${formatDate(targetStart)} kl. ${formatTime(targetStart.toISOString())}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setMovingAppointmentId(appointment.id);
      const response = await authFetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: targetStart.toISOString(),
          endTime: targetEnd.toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Villa við færslu tímans' }));
        alert(data.error ?? 'Villa við færslu tímans');
        return;
      }

      setAppointments((current) =>
        current.map((item) =>
          item.id === appointment.id
            ? {
                ...item,
                startTime: targetStart.toISOString(),
                endTime: targetEnd.toISOString(),
              }
            : item
        )
      );
    } catch (error) {
      console.error('Error moving appointment:', error);
      alert('Villa við færslu tímans');
    } finally {
      setMovingAppointmentId(null);
    }
  };

  const onDropAppointment = async (day: Date, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedId = draggedAppointmentId ?? event.dataTransfer.getData('text/plain');
    if (!droppedId) {
      return;
    }

    const container = event.currentTarget;
    const targetMinutes = getSnappedMinutesFromPointer(container, event.clientY);
    await moveAppointmentToSlot(droppedId, day, targetMinutes);
    setDraggedAppointmentId(null);
  };

  const onColumnTouchEnd = async (day: Date, event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchDraggingAppointmentId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    const container = event.currentTarget;
    const targetMinutes = getSnappedMinutesFromPointer(container, touch.clientY);
    await moveAppointmentToSlot(touchDraggingAppointmentId, day, targetMinutes);
    setTouchDraggingAppointmentId(null);
  };

  const startLongPress = (appointmentId: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      setTouchDraggingAppointmentId(appointmentId);
    }, 350);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setViewMode('day');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tímabókanir</h1>
          <Link href="/booking">
            <Button>Ný bókun</Button>
          </Link>
        </div>

        <Card>
          <CardContent>
            {loading ? (
              <p className="text-gray-600">Hleður...</p>
            ) : (
              <div className="space-y-4 pb-24 md:pb-0">
                {appointments.length === 0 && (
                  <p className="text-gray-600">Engar bókanir fundust. Þú getur samt flett milli daga/vikna og smellt til að bóka.</p>
                )}

                <PulseMetrics
                  weekLabel={weekLabel}
                  weekBooked={weekMetrics.weekBooked}
                  weekNoShow={weekMetrics.weekNoShow}
                  weekFreeSlots={weekMetrics.weekFreeSlots}
                  onPreviousWeek={() => shiftWeek(-1)}
                  onNextWeek={() => shiftWeek(1)}
                />

                <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2 rounded-xl border border-gray-200 bg-white p-3">
                  <Button
                    variant={viewMode === 'day' ? 'primary' : 'outline'}
                    onClick={() => setViewMode('day')}
                  >
                    Dagur
                  </Button>
                  <Button
                    variant={viewMode === 'week' ? 'primary' : 'outline'}
                    onClick={() => setViewMode('week')}
                  >
                    Vika
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" onClick={previousRange}>◀</Button>
                    <Button variant="outline" onClick={goToToday}>Í dag</Button>
                    <Button variant="outline" onClick={nextRange}>▶</Button>
                  </div>
                </div>

                <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white">
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-30 w-5 bg-gradient-to-l from-white to-transparent" />
                  {touchDraggingAppointmentId && (
                    <div className="md:hidden border-b border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 flex items-center justify-between gap-2">
                      <span>Veldu nýjan tíma í dagatalinu</span>
                      <Button variant="outline" onClick={() => setTouchDraggingAppointmentId(null)}>Hætta við</Button>
                    </div>
                  )}
                  <div className={viewMode === 'week' ? 'min-w-[980px]' : 'min-w-[340px]'}>
                    <div
                      className="sticky top-0 z-20 grid border-b border-gray-200 bg-gray-50 shadow-[0_2px_4px_rgba(15,23,42,0.06)]"
                      style={{ gridTemplateColumns: `68px repeat(${daysToRender.length}, minmax(130px, 1fr))` }}
                    >
                      <div className="sticky left-0 z-30 bg-gray-50" />
                      {viewMode === 'day' ? (
                        <div className="bg-gray-50 px-2 py-3 text-center font-semibold text-gray-700 border-l border-gray-200">
                          {formatSelectedDayLabel()}
                        </div>
                      ) : (
                        daysToRender.map((day) => (
                          <button
                            key={day.toISOString()}
                            type="button"
                            onClick={() => {
                              setSelectedDay(startOfDay(day));
                              setViewMode('day');
                            }}
                            className="bg-gray-50 px-2 py-3 text-center font-semibold text-gray-700 border-l border-gray-200 hover:bg-gray-100"
                          >
                            {formatDayLabel(day)}
                          </button>
                        ))
                      )}
                    </div>

                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `68px repeat(${daysToRender.length}, minmax(130px, 1fr))`,
                        height: `${gridHeight}px`,
                      }}
                    >
                      <div className="sticky left-0 z-20 relative border-r border-gray-200 bg-white shadow-[3px_0_8px_rgba(15,23,42,0.08)]">
                        {timeRows.map((label, index) => (
                          <div
                            key={label}
                            className="absolute left-0 w-full px-2 text-right text-sm text-gray-500"
                            style={{ top: `${index * rowHeight - 10}px` }}
                          >
                            {label}
                          </div>
                        ))}
                      </div>

                      {appointmentsByDay.map((dayAppointments, dayIndex) => (
                        <div
                          key={daysToRender[dayIndex].toISOString()}
                          className="relative border-l border-gray-200"
                          onClick={(event) => onColumnClick(daysToRender[dayIndex], event)}
                          onTouchEnd={(event) => {
                            void onColumnTouchEnd(daysToRender[dayIndex], event);
                          }}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            void onDropAppointment(daysToRender[dayIndex], event);
                          }}
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(to bottom, #f3f4f6 0, #f3f4f6 1px, transparent 1px, transparent 44px)',
                          }}
                        >
                          {getBlockedSegments(daysToRender[dayIndex]).map((segment, segmentIndex) => (
                            <div
                              key={`${daysToRender[dayIndex].toISOString()}-blocked-${segmentIndex}`}
                              className="pointer-events-none absolute left-0 right-0 bg-gray-200/70"
                              style={{ top: `${segment.top}px`, height: `${segment.height}px` }}
                            />
                          ))}

                          {dayAppointments.map((appointment) => {
                            const position = getEventPosition(appointment);
                            return (
                              <Link
                                key={appointment.id}
                                href={`/appointments/${appointment.id}`}
                                draggable={movingAppointmentId !== appointment.id}
                                onClick={(event) => {
                                  if (touchDraggingAppointmentId === appointment.id) {
                                    event.preventDefault();
                                    setTouchDraggingAppointmentId(null);
                                  }
                                  event.stopPropagation();
                                }}
                                onDragStart={(event) => {
                                  event.dataTransfer.setData('text/plain', appointment.id);
                                  setDraggedAppointmentId(appointment.id);
                                }}
                                onDragEnd={() => setDraggedAppointmentId(null)}
                                onTouchStart={() => startLongPress(appointment.id)}
                                onTouchEnd={clearLongPress}
                                onTouchCancel={clearLongPress}
                                className={`absolute z-10 left-1 right-1 cursor-move rounded-md px-2 py-1 text-white shadow-sm hover:bg-rose-500 ${
                                  touchDraggingAppointmentId === appointment.id ? 'bg-rose-600 ring-2 ring-blue-500' : 'bg-rose-400'
                                }`}
                                style={{ top: `${position.top}px`, height: `${position.height}px` }}
                              >
                                <p className="truncate text-sm font-semibold">{appointment.client.name}</p>
                                <p className="text-sm leading-4">
                                  {formatTime(appointment.startTime)} ({Math.max(Math.round((new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) / 60000), 15)}m)
                                </p>
                                <p className="truncate text-sm leading-4">{formatBookedService(appointment)}</p>
                              </Link>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <Button variant="outline" onClick={previousRange}>◀</Button>
                  <p className="font-semibold text-gray-700">
                    {viewMode === 'day' ? formatSelectedDayLabel() : formatWeekLabel()}
                  </p>
                  <Button variant="outline" onClick={nextRange}>▶</Button>
                </div>

                <div className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3">
                  <div className="mx-auto max-w-7xl flex items-center justify-between gap-2">
                    <Button variant="outline" onClick={previousRange}>◀</Button>
                    <Button
                      variant={viewMode === 'day' ? 'primary' : 'outline'}
                      onClick={() => setViewMode('day')}
                    >
                      Dagur
                    </Button>
                    <Button
                      variant={viewMode === 'week' ? 'primary' : 'outline'}
                      onClick={() => setViewMode('week')}
                    >
                      Vika
                    </Button>
                    <Button variant="outline" onClick={goToToday}>Í dag</Button>
                    <Button variant="outline" onClick={nextRange}>▶</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
