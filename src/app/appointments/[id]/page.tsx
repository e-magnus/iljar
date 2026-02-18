'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';

interface Visit {
  id: string;
  soapS: string | null;
  soapO: string | null;
  soapA: string | null;
  soapP: string | null;
  createdAt: string;
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

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointment() {
      try {
        const res = await fetch(`/api/appointments/${params.id}`);
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

  const handleMarkArrived = async () => {
    try {
      const res = await fetch(`/api/appointments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARRIVED' }),
      });

      if (res.ok) {
        const data = await res.json();
        setAppointment(data.appointment);
      }
    } catch (error) {
      console.error('Error marking as arrived:', error);
    }
  };

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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('is-IS', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

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
                  {appointment.type && (
                    <div>
                      <p className="text-sm text-gray-600">Tegund</p>
                      <p className="text-lg">{appointment.type}</p>
                    </div>
                  )}
                  {appointment.note && (
                    <div>
                      <p className="text-sm text-gray-600">Athugasemd</p>
                      <p className="text-lg">{appointment.note}</p>
                    </div>
                  )}
                  <div className="pt-4 flex gap-3">
                    {appointment.status === 'BOOKED' && (
                      <Button onClick={handleMarkArrived}>Merkja sem mætt</Button>
                    )}
                    {(appointment.status === 'ARRIVED' || appointment.status === 'BOOKED') && (
                      <Button
                        onClick={() => router.push(`/visits/new?appointmentId=${appointment.id}`)}
                        variant="primary"
                      >
                        Skrá heimsókn
                      </Button>
                    )}
                  </div>
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

          {/* Right Column - Client Info */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Skjólstæðingur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Nafn</p>
                    <p className="text-lg font-semibold">{appointment.client.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Símanúmer</p>
                    <p className="text-lg">{appointment.client.phone}</p>
                  </div>
                  {appointment.client.kennitala && (
                    <div>
                      <p className="text-sm text-gray-600">Kennitala</p>
                      <p className="text-lg">{appointment.client.kennitala}</p>
                    </div>
                  )}
                  <div className="pt-4">
                    <Button
                      onClick={() => router.push(`/clients/${appointment.client.id}`)}
                      variant="outline"
                      className="w-full"
                    >
                      Skoða sögu
                    </Button>
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
