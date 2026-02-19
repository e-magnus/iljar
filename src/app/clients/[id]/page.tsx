'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { authFetch } from '@/lib/api/client';

interface Appointment {
  id: string;
  startTime: string;
  status: string;
  type: string | null;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  kennitala?: string | null;
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const [clientRes, appointmentsRes] = await Promise.all([
          authFetch(`/api/clients/${params.id}`),
          authFetch(`/api/appointments?clientId=${params.id}`),
        ]);

        if (clientRes.status === 404) {
          setNotFound(true);
          setClient(null);
          setAppointments([]);
          return;
        }

        if (!clientRes.ok || !appointmentsRes.ok) {
          throw new Error('Failed to fetch client history');
        }

        const clientData = await clientRes.json();
        const appointmentsData = await appointmentsRes.json();

        setClient(clientData.client ?? null);
        setAppointments(appointmentsData.appointments ?? []);
      } catch (error) {
        console.error('Error fetching client history:', error);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchHistory();
    }
  }, [params.id]);

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
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skjólstæðingasaga</h1>
          {notFound ? (
            <p className="text-gray-700 mt-1">Skjólstæðingur fannst ekki.</p>
          ) : client && (
            <p className="text-gray-700 mt-1">
              {client.name} · {client.phone}
            </p>
          )}
          {!notFound && client?.kennitala && (
            <p className="text-gray-700 text-sm mt-1">Kennitala: {client.kennitala}</p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ferill bókana</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600">Hleður...</p>
            ) : appointments.length === 0 ? (
              <p className="text-gray-600">Engar bókanir fundust fyrir þennan skjólstæðing.</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <Link
                    key={appointment.id}
                    href={`/appointments/${appointment.id}`}
                    className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-gray-900">{formatDateTime(appointment.startTime)}</p>
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
