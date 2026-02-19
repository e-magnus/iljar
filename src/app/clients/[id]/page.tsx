'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { authFetch } from '@/lib/api/client';

interface Appointment {
  id: string;
  startTime: string;
  endTime?: string;
  status: string;
  type: string | null;
  note?: string | null;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  kennitala?: string | null;
}

interface Visit {
  id: string;
  soapS: string | null;
  soapO: string | null;
  soapA: string | null;
  soapP: string | null;
  createdAt: string;
  photos?: Array<{ id: string }>;
}

interface AppointmentDetail {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string | null;
  note: string | null;
  visits: Visit[];
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('is-IS', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dateString));
}

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat('is-IS', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function formatPhone(phone: string) {
  return phone.replace(/\s+/g, '');
}

function maskedKennitala(value?: string | null) {
  if (!value) return '—';
  const plain = value.replace(/[^0-9]/g, '');
  if (plain.length < 4) return value;
  return `****${plain.slice(-4)}`;
}

function avgIntervalDays(dates: Date[]) {
  if (dates.length < 2) {
    return null;
  }

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
  }
  return Math.round(total / (sorted.length - 1));
}

function extractMedicalSignals(detail: AppointmentDetail | null, appointments: Appointment[]) {
  const textBlob = [
    detail?.note,
    detail?.visits?.[0]?.soapS,
    detail?.visits?.[0]?.soapO,
    detail?.visits?.[0]?.soapA,
    detail?.visits?.[0]?.soapP,
    ...appointments.map((appointment) => appointment.note),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const allergies: string[] = [];
  const conditions: string[] = [];
  const medications: string[] = [];

  if (textBlob.includes('ofnæmi') || textBlob.includes('latex')) {
    allergies.push(textBlob.includes('latex') ? 'Latex' : 'Ótilgreint ofnæmi');
  }

  if (textBlob.includes('diabetes') || textBlob.includes('sykursýki')) {
    conditions.push('Diabetes');
  }
  if (textBlob.includes('hjarta')) {
    conditions.push('Hjartasjúkdómur');
  }
  if (textBlob.includes('taug')) {
    conditions.push('Taugatengd einkenni');
  }

  if (textBlob.includes('blóðþynn') || textBlob.includes('warfarin') || textBlob.includes('eliquis')) {
    medications.push('Blóðþynnandi lyf');
  }

  return { allergies, conditions, medications };
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [latestDetail, setLatestDetail] = useState<AppointmentDetail | null>(null);
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

        const appointmentItems: Appointment[] = appointmentsData.appointments ?? [];
        const latestCompleted = appointmentItems.find((appointment) => appointment.status === 'COMPLETED') ?? appointmentItems[0];

        setClient(clientData.client ?? null);
        setAppointments(appointmentItems);

        if (latestCompleted?.id) {
          const detailRes = await authFetch(`/api/appointments/${latestCompleted.id}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            setLatestDetail(detailData.appointment ?? null);
          }
        }
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

  const now = new Date();
  const nextAppointment = appointments
    .filter((appointment) => new Date(appointment.startTime).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const appointmentDates = appointments.map((appointment) => new Date(appointment.startTime));
  const visitsLastSixMonths = appointmentDates.filter((date) => date >= sixMonthsAgo).length;
  const averageInterval = avgIntervalDays(appointmentDates);
  const lastVisitDate = appointments[0]?.startTime;

  const medical = extractMedicalSignals(latestDetail, appointments);
  const hasFollowUpAlert = Boolean(
    latestDetail?.visits?.[0]?.soapP?.toLowerCase().includes('eftirfylgd') ||
      latestDetail?.note?.toLowerCase().includes('eftirfylgd')
  );

  const alerts = [
    ...medical.allergies.map((item) => `Ofnæmi skráð: ${item}.`),
    ...(medical.conditions.includes('Diabetes') ? ['Diabetes skráð — fylgjast með gróanda og þrýstingi.'] : []),
    ...(medical.medications.includes('Blóðþynnandi lyf') ? ['Blóðþynnandi lyf — gæta sérstaklega að blæðingarhættu.'] : []),
    ...(hasFollowUpAlert ? ['Síðasta meðferð gaf til kynna þörf á eftirfylgd.'] : []),
  ].slice(0, 3);

  const primaryVisit = latestDetail?.visits?.[0] ?? null;
  const photoCount = latestDetail?.visits?.reduce((count, visit) => count + (visit.photos?.length ?? 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">Skjólstæðingayfirlit</h1>
          {client && (
            <div className="mt-1 space-y-1">
              <p className="text-sm font-medium text-gray-900">{client.name}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <a href={`tel:${formatPhone(client.phone)}`} className="font-medium text-blue-700">{client.phone}</a>
                <span>•</span>
                <span>ID: {maskedKennitala(client.kennitala)}</span>
                <span>•</span>
                <span>
                  Næsti tími: {nextAppointment ? formatDateTime(nextAppointment.startTime) : 'Enginn bókaður'}
                </span>
              </div>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            {medical.allergies.length > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">OFNÆMI</span>
            )}
            {medical.conditions.includes('Diabetes') && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">DIABETES</span>
            )}
            {medical.medications.includes('Blóðþynnandi lyf') && (
              <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-800">BLÓÐÞYNNANDI</span>
            )}
            {(primaryVisit?.soapP || latestDetail?.note) && (
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">ATHUGASEMD</span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Link href={nextAppointment ? `/visits/new?appointmentId=${nextAppointment.id}` : '/visits/new'}>
              <Button size="sm" className="h-11 w-full">Ný meðferð</Button>
            </Link>
            <a href="#notes-card">
              <Button size="sm" variant="outline" className="h-11 w-full">Athugasemd</Button>
            </a>
            <a href="#history-card">
              <Button size="sm" variant="outline" className="h-11 w-full">Full saga</Button>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-4">
        {loading ? (
          <Card>
            <CardContent>
              <p className="text-gray-600">Hleður...</p>
            </CardContent>
          </Card>
        ) : notFound ? (
          <Card>
            <CardContent>
              <p className="text-gray-700">Skjólstæðingur fannst ekki.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Síðast gert</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {latestDetail ? (
                  <>
                    <p className="text-sm text-gray-600">{formatDateTime(latestDetail.startTime)} · {latestDetail.type ?? 'Meðferð'}</p>
                    <p className="line-clamp-3 text-sm leading-6 text-gray-800">
                      {primaryVisit?.soapA || primaryVisit?.soapS || latestDetail.note || 'Engin samantekt skráð.'}
                    </p>
                    <p className="line-clamp-2 text-sm leading-6 text-gray-700">
                      Ráðleggingar: {primaryVisit?.soapP || 'Engar sértækar ráðleggingar skráðar.'}
                    </p>
                    {hasFollowUpAlert && (
                      <p className="text-sm font-medium text-amber-700">Óunnið: Eftirfylgd nauðsynleg.</p>
                    )}
                    <div className="flex gap-2">
                      <Link href={`/appointments/${latestDetail.id}`}>
                        <Button size="sm">Skoða nánar</Button>
                      </Link>
                      {nextAppointment && (
                        <Link href={`/visits/new?appointmentId=${nextAppointment.id}`}>
                          <Button size="sm" variant="outline">Halda áfram</Button>
                        </Link>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-600">Engin síðasta meðferð fannst.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Heilsufar / Áhætta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ofnæmi</p>
                  {medical.allergies.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {medical.allergies.map((item) => (
                        <span key={item} className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">{item}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-600">Ekkert ofnæmi skráð.</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sjúkdómar</p>
                  {medical.conditions.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {medical.conditions.map((item) => (
                        <span key={item} className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">{item}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-600">Engir áhættuþættir skráðir.</p>
                  )}
                </div>

                <details>
                  <summary className="cursor-pointer text-sm font-medium text-gray-800">Lyf {medical.medications.length > 0 ? `(${medical.medications.length})` : ''}</summary>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {medical.medications.length > 0 ? (
                      medical.medications.map((item) => (
                        <span key={item} className="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-800">{item}</span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600">Engin lyf skráð.</p>
                    )}
                  </div>
                </details>
              </CardContent>
            </Card>

            {alerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Viðvörun</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {alerts.map((alert) => (
                      <li key={alert} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{alert}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Komutíðni og saga í tölum</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Komur alls</p>
                    <p className="text-lg font-semibold text-gray-900">{appointments.length}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Síðustu 6 mán</p>
                    <p className="text-lg font-semibold text-gray-900">{visitsLastSixMonths}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Millibil</p>
                    <p className="text-lg font-semibold text-gray-900">{averageInterval !== null ? `${averageInterval} d` : '—'}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Síðast kom</p>
                    <p className="text-sm font-semibold text-gray-900">{lastVisitDate ? formatDate(lastVisitDate) : '—'}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-gray-800">Síðustu 3 heimsóknir</p>
                  <div className="space-y-2">
                    {appointments.slice(0, 3).map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                        <p className="text-sm text-gray-800">{formatDateTime(appointment.startTime)}</p>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {appointment.type ?? appointment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div id="notes-card">
              <Card>
                <CardHeader>
                  <CardTitle>Athugasemdir</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Mikilvægt</p>
                  <p className="mt-1 text-sm leading-6 text-blue-900">
                    {primaryVisit?.soapP || latestDetail?.note || 'Engin pin-uð athugasemd skráð.'}
                  </p>
                </div>

                <details>
                  <summary className="cursor-pointer text-sm font-medium text-gray-800">Sjá allar</summary>
                  <div className="mt-2 space-y-2">
                    {appointments.slice(0, 6).map((appointment) => (
                      <Link
                        key={appointment.id}
                        href={`/appointments/${appointment.id}`}
                        className="block rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                      >
                        {formatDateTime(appointment.startTime)} · {appointment.type ?? 'Meðferð'}
                      </Link>
                    ))}
                  </div>
                </details>
                </CardContent>
              </Card>
            </div>

            <div id="history-card">
              <Card>
                <CardHeader>
                  <CardTitle>Skráningar / skjöl</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Myndir</p>
                    <p className="text-base font-semibold text-gray-900">{photoCount}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Samþykki</p>
                    <p className="text-base font-semibold text-gray-900">Óaðgengilegt</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Skjöl</p>
                    <p className="text-base font-semibold text-gray-900">0</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Tilvísanir</p>
                    <p className="text-base font-semibold text-gray-900">0</p>
                  </div>
                </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
