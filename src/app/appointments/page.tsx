'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { authFetch } from '@/lib/api/client';
import { formatDDMM, formatDDMMYYYY, formatIcelandicDayLabel, formatIcelandicDayLabelShort, formatTimeHHMM } from '@/lib/format/date';

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

interface WorkingHour {
  weekday: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface TimeOff {
  id: string;
  startDatetime: string;
  endDatetime: string;
  reason: string | null;
}

interface BlockDraft {
  day: Date;
  dayKey: string;
  startMinute: number;
  currentMinute: number;
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

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
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
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [pendingBlock, setPendingBlock] = useState<{ day: Date; startMinute: number; endMinute: number } | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockingTime, setBlockingTime] = useState(false);
  const [suppressNextColumnClick, setSuppressNextColumnClick] = useState(false);
  const [unblockingTimeOffId, setUnblockingTimeOffId] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unblockLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const slotMinutes = 30;
  const rowHeight = 40;
  const timeColumnWidth = 56;
  const dayColumnMinWidth = 120;

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
  const rangeStartIso = rangeStart.toISOString();
  const rangeEndIso = rangeEnd.toISOString();

  useEffect(() => {
    async function fetchTimeOffs() {
      try {
        const params = new URLSearchParams({
          start: rangeStartIso,
          end: rangeEndIso,
        });
        const res = await authFetch(`/api/time-off?${params.toString()}`);
        if (!res.ok) {
          setTimeOffs([]);
          return;
        }

        const data = await res.json();
        setTimeOffs(data.timeOffs ?? []);
      } catch (error) {
        console.error('Error fetching time off:', error);
        setTimeOffs([]);
      }
    }

    void fetchTimeOffs();
  }, [rangeStartIso, rangeEndIso]);

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

  const toIsoDateFromMinute = (day: Date, minute: number) => {
    const value = new Date(day);
    value.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    return value.toISOString();
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
    if (minute < dayStartMinute || minute >= dayEndMinute) {
      return true;
    }

    const slotStart = new Date(day);
    slotStart.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + slotMinutes);

    return timeOffs.some((timeOff) => {
      const blockStart = new Date(timeOff.startDatetime);
      const blockEnd = new Date(timeOff.endDatetime);
      return slotStart < blockEnd && slotEnd > blockStart;
    });
  };

  const isOutsideWorkingHours = (day: Date, minute: number) => {
    const rule = getWorkingHoursForDay(day);
    if (!rule || !rule.enabled) {
      return true;
    }

    const dayStartMinute = parseTimeToMinutes(rule.startTime);
    const dayEndMinute = parseTimeToMinutes(rule.endTime);
    return minute < dayStartMinute || minute >= dayEndMinute;
  };

  const isMinuteInTimeOff = (day: Date, minute: number) => {
    const slotStart = new Date(day);
    slotStart.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + slotMinutes);

    return timeOffs.some((timeOff) => {
      const blockStart = new Date(timeOff.startDatetime);
      const blockEnd = new Date(timeOff.endDatetime);
      return slotStart < blockEnd && slotEnd > blockStart;
    });
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

  const getTimeOffSegments = (day: Date) => {
    const dayStart = startOfDay(day);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    return timeOffs
      .map((timeOff) => {
        const start = new Date(timeOff.startDatetime);
        const end = new Date(timeOff.endDatetime);

        if (end <= dayStart || start >= dayEnd) {
          return null;
        }

        const overlapStart = start < dayStart ? dayStart : start;
        const overlapEnd = end > dayEnd ? dayEnd : end;
        const overlapStartMinute = overlapStart.getHours() * 60 + overlapStart.getMinutes();
        const overlapEndMinute = overlapEnd.getHours() * 60 + overlapEnd.getMinutes();

        const clampedStartMinute = Math.max(overlapStartMinute, startMinutes);
        const clampedEndMinute = Math.min(overlapEndMinute, endMinutes);
        if (clampedEndMinute <= clampedStartMinute) {
          return null;
        }

        const top = ((clampedStartMinute - startMinutes) / slotMinutes) * rowHeight;
        const height = ((clampedEndMinute - clampedStartMinute) / slotMinutes) * rowHeight;

        return {
          id: timeOff.id,
          reason: timeOff.reason,
          top,
          height,
        };
      })
      .filter((segment): segment is { id: string; reason: string | null; top: number; height: number } => Boolean(segment));
  };

  const getBlockDraftSegment = (day: Date) => {
    if (!blockDraft || blockDraft.dayKey !== toDateInputValue(day)) {
      return null;
    }

    const minMinute = Math.min(blockDraft.startMinute, blockDraft.currentMinute);
    const maxMinute = Math.max(blockDraft.startMinute, blockDraft.currentMinute) + slotMinutes;
    const clampedStartMinute = Math.max(minMinute, startMinutes);
    const clampedEndMinute = Math.min(maxMinute, endMinutes);

    if (clampedEndMinute <= clampedStartMinute) {
      return null;
    }

    const top = ((clampedStartMinute - startMinutes) / slotMinutes) * rowHeight;
    const height = ((clampedEndMinute - clampedStartMinute) / slotMinutes) * rowHeight;

    return { top, height };
  };

  const clearBlockLongPress = () => {
    if (blockLongPressTimerRef.current) {
      clearTimeout(blockLongPressTimerRef.current);
      blockLongPressTimerRef.current = null;
    }
  };

  const clearUnblockLongPress = () => {
    if (unblockLongPressTimerRef.current) {
      clearTimeout(unblockLongPressTimerRef.current);
      unblockLongPressTimerRef.current = null;
    }
  };

  const handleDeleteTimeOff = async (timeOffId: string) => {
    const confirmed = window.confirm('Viltu afblokkun þessa tímabils?');
    if (!confirmed) {
      return;
    }

    try {
      setUnblockingTimeOffId(timeOffId);
      const response = await authFetch(`/api/time-off/${timeOffId}`, {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => ({ error: 'Ekki tókst að afblokkun.' }));
      if (!response.ok) {
        alert(data.error ?? 'Ekki tókst að afblokkun.');
        return;
      }

      setTimeOffs((current) => current.filter((item) => item.id !== timeOffId));
      setSuppressNextColumnClick(true);
    } catch (error) {
      console.error('Error deleting time off:', error);
      alert('Villa við afblokkun tímabils.');
    } finally {
      setUnblockingTimeOffId(null);
    }
  };

  const startUnblockLongPress = (timeOffId: string) => {
    clearUnblockLongPress();
    unblockLongPressTimerRef.current = setTimeout(() => {
      void handleDeleteTimeOff(timeOffId);
    }, 420);
  };

  const startBlockLongPress = (day: Date, container: HTMLDivElement, clientY: number) => {
    clearBlockLongPress();

    const startMinute = getSnappedMinutesFromPointer(container, clientY);
    const dayKey = toDateInputValue(day);

    blockLongPressTimerRef.current = setTimeout(() => {
      setBlockDraft({
        day: startOfDay(day),
        dayKey,
        startMinute,
        currentMinute: startMinute,
      });
      setSuppressNextColumnClick(true);
    }, 380);
  };

  const updateBlockDraft = (day: Date, container: HTMLDivElement, clientY: number) => {
    setBlockDraft((current) => {
      if (!current || current.dayKey !== toDateInputValue(day)) {
        return current;
      }

      const currentMinute = getSnappedMinutesFromPointer(container, clientY);
      return {
        ...current,
        currentMinute,
      };
    });
  };

  const completeBlockDraft = () => {
    clearBlockLongPress();

    if (!blockDraft) {
      return;
    }

    const startMinute = Math.min(blockDraft.startMinute, blockDraft.currentMinute);
    const endMinute = Math.max(blockDraft.startMinute, blockDraft.currentMinute) + slotMinutes;

    setPendingBlock({
      day: blockDraft.day,
      startMinute,
      endMinute,
    });
    setShowBlockModal(true);
    setBlockReason('');
    setBlockDraft(null);
    setSuppressNextColumnClick(true);
  };

  const onColumnClick = (day: Date, event: React.MouseEvent<HTMLDivElement>) => {
    if (touchDraggingAppointmentId || blockDraft) {
      return;
    }

    if (suppressNextColumnClick) {
      setSuppressNextColumnClick(false);
      return;
    }

    const container = event.currentTarget;
    const targetMinutes = getSnappedMinutesFromPointer(container, event.clientY);
    if (isMinuteInTimeOff(day, targetMinutes)) {
      alert('Þetta tímabil er blokkað. Afblokkið fyrst ef þú vilt bóka þennan tíma.');
      return;
    }

    const outsideWorkingHours = isOutsideWorkingHours(day, targetMinutes);
    if (outsideWorkingHours) {
      const confirmed = window.confirm('Þú ert að bóka utan vinnutíma. Viltu halda áfram?');
      if (!confirmed) {
        return;
      }
    }

    const targetDate = toDateInputValue(day);
    const targetTime = toTimeLabel(targetMinutes);
    const query = new URLSearchParams({
      date: targetDate,
      time: targetTime,
      ...(outsideWorkingHours ? { outsideHours: '1' } : {}),
    });
    router.push(`/booking?${query.toString()}`);
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
      if (blockDraft) {
        event.preventDefault();
        completeBlockDraft();
      } else {
        clearBlockLongPress();
      }
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

  const handleBlockTime = async () => {
    if (!pendingBlock) {
      return;
    }

    if (isMinuteBlocked(pendingBlock.day, pendingBlock.startMinute)) {
      alert('Ekki hægt að blokka utan virks vinnutíma.');
      return;
    }

    try {
      setBlockingTime(true);
      const response = await authFetch('/api/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDatetime: toIsoDateFromMinute(pendingBlock.day, pendingBlock.startMinute),
          endDatetime: toIsoDateFromMinute(pendingBlock.day, pendingBlock.endMinute),
          reason: blockReason,
        }),
      });

      const data = await response.json().catch(() => ({ error: 'Ekki tókst að blokka tíma.' }));
      if (!response.ok) {
        alert(data.error ?? 'Ekki tókst að blokka tíma.');
        return;
      }

      setTimeOffs((current) => [...current, data.timeOff]);
      setShowBlockModal(false);
      setPendingBlock(null);
      setBlockReason('');
    } catch (error) {
      console.error('Error blocking time:', error);
      alert('Villa við að blokka tíma.');
    } finally {
      setBlockingTime(false);
    }
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

      if (blockLongPressTimerRef.current) {
        clearTimeout(blockLongPressTimerRef.current);
      }

      if (unblockLongPressTimerRef.current) {
        clearTimeout(unblockLongPressTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-none px-0 py-0 md:max-w-7xl md:px-4 md:py-6">
        <Card className="rounded-none shadow-none md:rounded-lg md:shadow-md">
          <CardContent className="px-0 py-0 md:px-6 md:py-4">
            {loading ? (
              <p className="text-gray-600">Hleður...</p>
            ) : (
              <div className="pb-24 md:space-y-4 md:pb-0">
                {appointments.length === 0 && (
                  <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 md:mb-0">
                    Engar bókanir fundust. Smelltu á dagatalssvæði til að bóka tíma.
                  </div>
                )}

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

                <div className="relative -mx-4 overflow-x-auto border-y border-gray-200 bg-white md:mx-0 md:rounded-xl md:border">
                  {touchDraggingAppointmentId && (
                    <div className="md:hidden border-b border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 flex items-center justify-between gap-2">
                      <span>Veldu nýjan tíma í dagatalinu</span>
                      <Button variant="outline" onClick={() => setTouchDraggingAppointmentId(null)}>Hætta við</Button>
                    </div>
                  )}
                  <div className={viewMode === 'week' ? 'min-w-[860px] md:min-w-[980px]' : 'min-w-[320px] md:min-w-[340px]'}>
                    <div
                      className="sticky top-0 z-20 grid border-b border-gray-200 bg-gray-50 shadow-[0_2px_4px_rgba(15,23,42,0.06)]"
                      style={{ gridTemplateColumns: `${timeColumnWidth}px repeat(${daysToRender.length}, minmax(${dayColumnMinWidth}px, 1fr))` }}
                    >
                      <div className="sticky left-0 z-30 bg-gray-50" />
                      {viewMode === 'day' ? (
                        <div className="bg-gray-50 px-1.5 py-2 text-center text-sm font-semibold text-gray-700 border-l border-gray-200 md:px-2 md:py-3 md:text-base">
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
                            className="bg-gray-50 px-1.5 py-2 text-center text-sm font-semibold text-gray-700 border-l border-gray-200 hover:bg-gray-100 md:px-2 md:py-3 md:text-base"
                          >
                            {formatDayLabel(day)}
                          </button>
                        ))
                      )}
                    </div>

                    <div
                      className="grid min-h-[calc(100dvh-235px)] md:min-h-0"
                      style={{
                        gridTemplateColumns: `${timeColumnWidth}px repeat(${daysToRender.length}, minmax(${dayColumnMinWidth}px, 1fr))`,
                        height: `${gridHeight}px`,
                      }}
                    >
                      <div className="sticky left-0 z-20 relative border-r border-gray-200 bg-white shadow-[3px_0_8px_rgba(15,23,42,0.08)]">
                        {timeRows.map((label, index) => (
                          <div
                            key={label}
                            className="absolute left-0 w-full px-1 text-right text-[11px] font-medium text-gray-700 md:px-2 md:text-sm"
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
                          onMouseDown={(event) => {
                            const target = event.target as HTMLElement;
                            if (target.closest('a')) {
                              return;
                            }
                            startBlockLongPress(daysToRender[dayIndex], event.currentTarget, event.clientY);
                          }}
                          onMouseMove={(event) => {
                            updateBlockDraft(daysToRender[dayIndex], event.currentTarget, event.clientY);
                          }}
                          onMouseUp={() => {
                            if (blockDraft?.dayKey === toDateInputValue(daysToRender[dayIndex])) {
                              completeBlockDraft();
                            } else {
                              clearBlockLongPress();
                            }
                          }}
                          onMouseLeave={() => {
                            if (blockDraft?.dayKey === toDateInputValue(daysToRender[dayIndex])) {
                              completeBlockDraft();
                            } else {
                              clearBlockLongPress();
                            }
                          }}
                          onTouchStart={(event) => {
                            if (touchDraggingAppointmentId) {
                              return;
                            }

                            const target = event.target as HTMLElement;
                            if (target.closest('a')) {
                              return;
                            }

                            const touch = event.touches[0];
                            if (!touch) {
                              return;
                            }

                            startBlockLongPress(daysToRender[dayIndex], event.currentTarget, touch.clientY);
                          }}
                          onTouchMove={(event) => {
                            const touch = event.touches[0];
                            if (!touch) {
                              return;
                            }

                            updateBlockDraft(daysToRender[dayIndex], event.currentTarget, touch.clientY);
                          }}
                          onTouchEnd={(event) => {
                            void onColumnTouchEnd(daysToRender[dayIndex], event);
                          }}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            void onDropAppointment(daysToRender[dayIndex], event);
                          }}
                          style={{
                            backgroundImage:
                              `repeating-linear-gradient(to bottom, #f3f4f6 0, #f3f4f6 1px, transparent 1px, transparent ${rowHeight}px)`,
                          }}
                        >
                          {getBlockedSegments(daysToRender[dayIndex]).map((segment, segmentIndex) => (
                            <div
                              key={`${daysToRender[dayIndex].toISOString()}-blocked-${segmentIndex}`}
                              className="pointer-events-none absolute left-0 right-0 bg-gray-200/70"
                              style={{ top: `${segment.top}px`, height: `${segment.height}px` }}
                            />
                          ))}

                          {getTimeOffSegments(daysToRender[dayIndex]).map((segment) => (
                            <div
                              key={`${daysToRender[dayIndex].toISOString()}-timeoff-${segment.id}`}
                              className={`absolute left-0.5 right-0.5 rounded-md bg-amber-300/55 ${unblockingTimeOffId === segment.id ? 'animate-pulse' : ''}`}
                              style={{ top: `${segment.top}px`, height: `${segment.height}px` }}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                startUnblockLongPress(segment.id);
                              }}
                              onMouseUp={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                clearUnblockLongPress();
                              }}
                              onMouseLeave={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                clearUnblockLongPress();
                              }}
                              onTouchStart={(event) => {
                                event.stopPropagation();
                                startUnblockLongPress(segment.id);
                              }}
                              onTouchEnd={(event) => {
                                event.stopPropagation();
                                clearUnblockLongPress();
                              }}
                              title={segment.reason ? `${segment.reason} • Haltu inni til að afblokkun` : 'Haltu inni til að afblokkun'}
                            >
                              {segment.reason && segment.height >= 26 ? (
                                <span className="pointer-events-none block truncate px-1 py-0.5 text-[11px] font-medium text-amber-900">
                                  {segment.reason}
                                </span>
                              ) : null}
                            </div>
                          ))}

                          {(() => {
                            const draftSegment = getBlockDraftSegment(daysToRender[dayIndex]);
                            if (!draftSegment) {
                              return null;
                            }

                            return (
                              <div
                                className="pointer-events-none absolute left-0.5 right-0.5 rounded-md border border-amber-500 bg-amber-200/60"
                                style={{ top: `${draftSegment.top}px`, height: `${draftSegment.height}px` }}
                              />
                            );
                          })()}

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
                                className={`absolute z-10 left-0.5 right-0.5 cursor-move rounded-md px-1.5 py-0.5 text-white shadow-sm hover:bg-rose-500 ${
                                  touchDraggingAppointmentId === appointment.id ? 'bg-rose-600 ring-2 ring-blue-500' : 'bg-rose-400'
                                }`}
                                style={{ top: `${position.top}px`, height: `${position.height}px` }}
                              >
                                <p className="truncate text-xs font-medium leading-4">
                                  {appointment.client.name} • {formatTime(appointment.startTime)}
                                </p>
                              </Link>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <Button variant="outline" onClick={previousRange}>◀ Fyrri</Button>
                  <p className="font-semibold text-gray-700">
                    {viewMode === 'day' ? formatSelectedDayLabel() : formatWeekLabel()}
                  </p>
                  <Button variant="outline" onClick={nextRange}>Næsta ▶</Button>
                </div>

                <div className="md:hidden fixed inset-x-0 bottom-16 z-30 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-2.5">
                  <div className="mx-auto flex items-center justify-between gap-3 md:max-w-7xl">
                    <Button size="sm" className="h-9 w-9 min-h-0 rounded-md p-0 text-sm" variant="outline" onClick={() => shiftWeek(-1)} aria-label="Fyrri vika">◀</Button>
                    <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-700">
                      {formatWeekLabel()}
                    </p>
                    <Button size="sm" className="h-9 w-9 min-h-0 rounded-md p-0 text-sm" variant="outline" onClick={() => shiftWeek(1)} aria-label="Næsta vika">▶</Button>
                  </div>
                </div>

                {showBlockModal && pendingBlock && (
                  <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 md:items-center">
                    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                      <h2 className="text-lg font-semibold text-gray-900">Blokka tíma</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        {formatDate(pendingBlock.day)} • {toTimeLabel(pendingBlock.startMinute)} - {toTimeLabel(pendingBlock.endMinute)}
                      </p>

                      <div className="mt-3">
                        <label htmlFor="block-reason" className="mb-1 block text-sm text-gray-700">Ástæða (valfrjálst)</label>
                        <input
                          id="block-reason"
                          type="text"
                          value={blockReason}
                          onChange={(event) => setBlockReason(event.target.value)}
                          placeholder="T.d. læknisheimsókn"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                        />
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setShowBlockModal(false);
                            setPendingBlock(null);
                            setBlockReason('');
                          }}
                          disabled={blockingTime}
                        >
                          Hætta við
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleBlockTime}
                          disabled={blockingTime}
                        >
                          {blockingTime ? 'Blokka...' : 'Blokka tíma'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
