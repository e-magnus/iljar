'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { authFetch } from '@/lib/api/client';

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  client: {
    name: string;
    phone: string;
  };
  type: string | null;
  status: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

export default function DashboardPage() {
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [nextSlot, setNextSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const appointmentRes = await authFetch('/api/appointments?next=true');
        const appointmentData = await appointmentRes.json();
        setNextAppointment(appointmentData.appointment);

        const slotRes = await authFetch('/api/slots?next=true');
        const slotData = await slotRes.json();
        setNextSlot(slotData.slot);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('is-IS', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('is-IS', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Hleður...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">iljar</h1>
          <p className="text-sm text-gray-600">Fótaaðgerðafræðingur</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Næsti tími</CardTitle>
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">{nextAppointment.client.name}</p>
                    <p className="text-sm text-gray-600">{nextAppointment.client.phone}</p>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-gray-700">{formatDate(nextAppointment.startTime)}</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatTime(nextAppointment.startTime)} - {formatTime(nextAppointment.endTime)}
                    </p>
                    {nextAppointment.type && <p className="text-sm text-gray-600 mt-1">{nextAppointment.type}</p>}
                  </div>
                  <div className="pt-3">
                    <Link href={`/appointments/${nextAppointment.id}`}>
                      <Button className="w-full">Skoða tíma</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Engir komandi tímar</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Næsti lausi tími</CardTitle>
            </CardHeader>
            <CardContent>
              {nextSlot ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{formatDate(nextSlot.start)}</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatTime(nextSlot.start)} - {formatTime(nextSlot.end)}
                    </p>
                  </div>
                  <div className="pt-3">
                    <Link href="/booking">
                      <Button className="w-full" variant="outline">Bóka tíma</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Engir lausir tímar í boði</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
