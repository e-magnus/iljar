'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { authFetch } from '@/lib/api/client';

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

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('is-IS', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tímabókanir</h1>
          <Link href="/booking">
            <Button>Ný bókun</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Allar bókanir</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600">Hleður...</p>
            ) : appointments.length === 0 ? (
              <p className="text-gray-600">Engar bókanir fundust.</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <Link
                    key={appointment.id}
                    href={`/appointments/${appointment.id}`}
                    className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900">{appointment.client.name}</p>
                        <p className="text-sm text-gray-600">{formatDateTime(appointment.startTime)}</p>
                      </div>
                      <p className="text-sm text-gray-700">{appointment.status}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
