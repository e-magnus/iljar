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

export default function Home() {
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [nextSlot, setNextSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch next appointment
        const appointmentRes = await authFetch('/api/appointments?next=true');
        const appointmentData = await appointmentRes.json();
        setNextAppointment(appointmentData.appointment);

        // Fetch next available slot
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
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">iljar</h1>
          <p className="text-sm text-gray-600">Fótaaðgerðafræðingur</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Next Appointment Card */}
          <Card>
            <CardHeader>
              <CardTitle>Næsti tími</CardTitle>
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">
                      {nextAppointment.client.name}
                    </p>
                    <p className="text-sm text-gray-600">{nextAppointment.client.phone}</p>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-gray-700">
                      {formatDate(nextAppointment.startTime)}
                    </p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatTime(nextAppointment.startTime)} - {formatTime(nextAppointment.endTime)}
                    </p>
                    {nextAppointment.type && (
                      <p className="text-sm text-gray-600 mt-1">{nextAppointment.type}</p>
                    )}
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

          {/* Next Available Slot Card */}
          <Card>
            <CardHeader>
              <CardTitle>Næsti lausi tími</CardTitle>
            </CardHeader>
            <CardContent>
              {nextSlot ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {formatDate(nextSlot.start)}
                    </p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatTime(nextSlot.start)} - {formatTime(nextSlot.end)}
                    </p>
                  </div>
                  <div className="pt-3">
                    <Link href="/booking">
                      <Button className="w-full" variant="outline">
                        Bóka tíma
                      </Button>
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

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Flýtiaðgerðir</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/appointments">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="text-center py-6">
                  <svg
                    className="mx-auto h-12 w-12 text-blue-600 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="font-medium text-gray-900">Tímabók</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/clients">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="text-center py-6">
                  <svg
                    className="mx-auto h-12 w-12 text-blue-600 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <p className="font-medium text-gray-900">Skjólstæðingar</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/availability">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="text-center py-6">
                  <svg
                    className="mx-auto h-12 w-12 text-blue-600 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="font-medium text-gray-900">Vinnustundir</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/settings">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="text-center py-6">
                  <svg
                    className="mx-auto h-12 w-12 text-blue-600 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <p className="font-medium text-gray-900">Stillingar</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
