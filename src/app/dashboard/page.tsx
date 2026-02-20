'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { authFetch } from '@/lib/api/client';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/Button';
import { PulseMetrics } from '@/components/dashboard/PulseMetrics';
import { TodayTimeline } from '@/components/dashboard/TodayTimeline';
import { DashboardAppointment, DashboardSummaryResponse } from '@/components/dashboard/types';

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

function getIsoWeekNumber(dateString: string): number {
  const date = new Date(dateString);
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekLabel(week: DashboardSummaryResponse['week']): string {
  const range = `(${formatShortDate(week.start)} - ${formatShortDate(week.end)})`;

  if (week.offset === 0) return `Þessi vika ${range}`;
  if (week.offset === 1) return `Næsta vika ${range}`;
  if (week.offset === 2) return `Þar næsta vika ${range}`;
  if (week.offset === -1) return `Síðasta vika ${range}`;
  if (week.offset === -2) return `Þar síðasta vika ${range}`;

  const isoWeek = getIsoWeekNumber(week.start);
  return `Vika ${String(isoWeek).padStart(2, '0')} ${range}`;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setError(null);

    const [summaryRes, appointmentsRes] = await Promise.all([
      authFetch(`/api/me/summary?weekOffset=${weekOffset}`),
      authFetch(`/api/appointments?date=${selectedDate}`),
    ]);

    if (summaryRes.status === 401 || appointmentsRes.status === 401) {
      setAuthRequired(true);
      return;
    }

    if (!summaryRes.ok || !appointmentsRes.ok) {
      throw new Error('Óaðgengilegt');
    }

    const summaryData = (await summaryRes.json()) as DashboardSummaryResponse;
    const appointmentsData = await appointmentsRes.json();

    setSummary(summaryData);
    setAppointments(appointmentsData.appointments ?? []);
    setAuthRequired(false);
  }, [selectedDate, weekOffset]);

  const shiftDate = (deltaDays: number) => {
    setSelectedDate((previousDate) => {
      const date = new Date(`${previousDate}T00:00:00`);
      date.setDate(date.getDate() + deltaDays);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${date.getFullYear()}-${month}-${day}`;
    });
  };

  useEffect(() => {
    trackEvent('view_dashboard');

    let mounted = true;

    async function initialLoad() {
      try {
        await fetchDashboard();
      } catch {
        if (mounted) {
          setError('Óaðgengilegt');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialLoad();

    const interval = window.setInterval(() => {
      fetchDashboard().catch(() => {
      });
    }, 60000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [fetchDashboard]);

  const onRetry = async () => {
    setLoading(true);
    setError(null);

    try {
      await fetchDashboard();
    } catch {
      setError('Óaðgengilegt');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <p className="text-center text-gray-700">Hleð dashboard...</p>
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-gray-800">Innskráning rann út eða vantar.</p>
          <Link href="/login" className="mt-4 inline-flex">
            <Button>Fara í innskráningu</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-gray-800">Gögn eru óaðgengileg í augnablikinu.</p>
          <Button className="mt-4" onClick={onRetry}>Reyna aftur</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      <div className="min-h-screen">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Heim</h1>
              <p className="text-sm text-gray-600">Innskráður notandi: {summary.currentUser.name}</p>
            </div>

            <PulseMetrics
              weekLabel={getWeekLabel(summary.week)}
              weekBooked={summary.metrics.weekBooked}
              weekNoShow={summary.metrics.weekNoShow}
              weekFreeSlots={summary.metrics.weekFreeSlots}
              onPreviousWeek={() => setWeekOffset((previous) => previous - 1)}
              onNextWeek={() => setWeekOffset((previous) => previous + 1)}
            />
          </div>

          <TodayTimeline
            selectedDate={selectedDate}
            appointments={appointments}
            onPreviousDay={() => shiftDate(-1)}
            onNextDay={() => shiftDate(1)}
          />
        </main>
      </div>
    </div>
  );
}
