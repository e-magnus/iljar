'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { authFetch } from '@/lib/api/client';

interface Appointment {
  id: string;
  startTime: string;
  endTime?: string;
  status: string;
  type: string | null;
  note?: string | null;
}

interface AppointmentVisitPhoto {
  id: string;
  type: 'BEFORE' | 'AFTER';
  downloadUrl?: string;
}

interface AppointmentVisit {
  id: string;
  soapS: string | null;
  soapO: string | null;
  soapA: string | null;
  soapP: string | null;
  photos?: AppointmentVisitPhoto[];
}

interface AppointmentWithDetails {
  id: string;
  visits: AppointmentVisit[];
}

interface Client {
  id: string;
  name: string;
  phone: string;
  kennitala?: string | null;
  clinicalFlags?: string[];
  customClinicalFlags?: string[];
  contactNote?: string | null;
}

interface ClientOverviewVisibility {
  showKennitala: boolean;
  showPhone: boolean;
  showFlags: boolean;
}

const defaultClientOverviewVisibility: ClientOverviewVisibility = {
  showKennitala: true,
  showPhone: true,
  showFlags: true,
};

const builtInFlagLabels: Record<string, string> = {
  ANTICOAGULANT: '🩸 Blóðþynning',
  DIABETES: '🧪 Sykursýki',
  ALLERGY: '⚠️ Ofnæmi',
  NEUROPATHY: '🦶 Taugakvilli',
  PACEMAKER: '❤️ Gangráður',
  OTHER: 'ℹ️ Annað',
};

interface TreatmentPhoto {
  file: File;
  type: 'BEFORE' | 'AFTER';
  preview: string;
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year} kl. ${hours}:${minutes}`;
}

function formatPhone(phone: string) {
  return phone.replace(/\s+/g, '');
}

function formatWeeksAndDays(totalDays: number) {
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  const weekLabel = weeks === 1 ? 'vika' : 'vikur';
  const dayLabel = days === 1 ? 'dagur' : 'dagar';

  if (weeks === 0) {
    return `${days} ${dayLabel}`;
  }

  return `${weeks} ${weekLabel} og ${days} ${dayLabel}`;
}

function formatBookedService(appointment: Pick<Appointment, 'type' | 'startTime' | 'endTime'>): string {
  const serviceName = appointment.type ?? 'Almenn meðferð';

  if (!appointment.endTime) {
    return serviceName;
  }

  const durationMinutes = Math.max(
    0,
    Math.round((new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) / 60000)
  );

  if (durationMinutes <= 0) {
    return serviceName;
  }

  return `${serviceName} (${durationMinutes} mín)`;
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'treatment' | 'history' | 'notes'>('treatment');
  const [soapS, setSoapS] = useState('');
  const [soapO, setSoapO] = useState('');
  const [soapA, setSoapA] = useState('');
  const [soapP, setSoapP] = useState('');
  const [treatmentPhotos, setTreatmentPhotos] = useState<TreatmentPhoto[]>([]);
  const [savingTreatment, setSavingTreatment] = useState(false);
  const [treatmentMessage, setTreatmentMessage] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);
  const [memoMessage, setMemoMessage] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentDetailsById, setAppointmentDetailsById] = useState<Record<string, AppointmentWithDetails>>({});
  const [showOlderVisits, setShowOlderVisits] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [overviewVisibility, setOverviewVisibility] = useState<ClientOverviewVisibility>(defaultClientOverviewVisibility);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const [clientRes, appointmentsRes, settingsRes] = await Promise.all([
          authFetch(`/api/clients/${params.id}`),
          authFetch(`/api/appointments?clientId=${params.id}`),
          authFetch('/api/settings'),
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
        const settingsData = await settingsRes.json().catch(() => null);

        const appointmentItems: Appointment[] = appointmentsData.appointments ?? [];

        const fetchedClient = clientData.client ?? null;
        setClient(fetchedClient);
        setMemoText(fetchedClient?.contactNote ?? '');
        setAppointments(appointmentItems);
        const nextOverview = settingsData?.clients?.overview;
        if (nextOverview) {
          setOverviewVisibility({
            showKennitala: Boolean(nextOverview.showKennitala),
            showPhone: Boolean(nextOverview.showPhone),
            showFlags: Boolean(nextOverview.showFlags),
          });
        } else {
          setOverviewVisibility(defaultClientOverviewVisibility);
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

  useEffect(() => {
    if (activeTab !== 'history') {
      return;
    }

    const latestIds = appointments.slice(0, 3).map((appointment) => appointment.id);
    if (latestIds.length === 0) {
      setAppointmentDetailsById({});
      return;
    }

    let mounted = true;

    async function fetchLatestDetails() {
      try {
        const responses = await Promise.all(latestIds.map((id) => authFetch(`/api/appointments/${id}`)));

        const details: Record<string, AppointmentWithDetails> = {};

        for (let index = 0; index < responses.length; index += 1) {
          const response = responses[index];
          if (!response.ok) {
            continue;
          }

          const data = await response.json();
          if (data?.appointment) {
            details[latestIds[index]] = data.appointment as AppointmentWithDetails;
          }
        }

        if (mounted) {
          setAppointmentDetailsById(details);
        }
      } catch (error) {
        console.error('Error fetching appointment details:', error);
      }
    }

    fetchLatestDetails();

    return () => {
      mounted = false;
    };
  }, [activeTab, appointments]);

  const saveTreatment = async () => {
    if (!nextAppointment?.id) {
      setTreatmentMessage('Enginn bókaður tími til að skrá meðferð á.');
      return;
    }

    setSavingTreatment(true);
    setTreatmentMessage(null);

    try {
      const response = await authFetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: nextAppointment.id,
          soapS,
          soapO,
          soapA,
          soapP,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save treatment');
      }

      const data = await response.json();
      const visitId = data?.visit?.id as string | undefined;

      const photoUploadErrors: string[] = [];

      if (visitId && treatmentPhotos.length > 0) {
        for (const photo of treatmentPhotos) {
          const urlResponse = await authFetch('/api/photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visitId,
              filename: photo.file.name,
              contentType: photo.file.type,
              photoType: photo.type,
            }),
          });

          if (!urlResponse.ok) {
            const payload = await urlResponse.json().catch(() => null);
            const details = typeof payload?.error === 'string' ? payload.error : 'Failed to prepare photo upload';
            photoUploadErrors.push(details);
            continue;
          }

          const { uploadUrl } = await urlResponse.json();
          const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': photo.file.type },
            body: photo.file,
          });

          if (!uploadResponse.ok) {
            photoUploadErrors.push('Failed to upload photo');
          }
        }
      }

      setSoapS('');
      setSoapO('');
      setSoapA('');
      setSoapP('');
      treatmentPhotos.forEach((photo) => URL.revokeObjectURL(photo.preview));
      setTreatmentPhotos([]);

      if (photoUploadErrors.length === 0) {
        setTreatmentMessage('Meðferð skráð.');
      } else if (photoUploadErrors.some((error) => error.startsWith('S3 configuration error:'))) {
        setTreatmentMessage('Meðferð skráð en myndaupphleðsla er óvirk þar til S3 lyklar hafa verið stilltir rétt í .env.');
      } else {
        setTreatmentMessage('Meðferð skráð en ekki tókst að hlaða upp öllum myndum.');
      }
    } catch (error) {
      console.error('Error saving treatment:', error);
      const message = error instanceof Error ? error.message : '';
      if (message.includes('CORS') || message.includes('Failed to fetch')) {
        setTreatmentMessage('Myndaupphleðsla var stöðvuð (CORS). Athugaðu S3 CORS stillingar fyrir þetta origin.');
      } else if (message.startsWith('S3 configuration error:')) {
        setTreatmentMessage(message);
      } else {
        setTreatmentMessage('Ekki tókst að vista meðferð.');
      }
    } finally {
      setSavingTreatment(false);
    }
  };

  const saveMemo = async () => {
    if (!client) {
      return;
    }

    setSavingMemo(true);
    setMemoMessage(null);

    try {
      const response = await authFetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactNote: memoText }),
      });

      if (!response.ok) {
        throw new Error('Failed to save memo');
      }

      const data = await response.json();
      setClient(data.client ?? client);
      setMemoMessage('Minnispunktur vistaður.');
    } catch (error) {
      console.error('Error saving memo:', error);
      setMemoMessage('Ekki tókst að vista minnispunkt.');
    } finally {
      setSavingMemo(false);
    }
  };

  const handleTreatmentPhotoAdd = (event: React.ChangeEvent<HTMLInputElement>, type: 'BEFORE' | 'AFTER') => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const newPhotos: TreatmentPhoto[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      newPhotos.push({
        file,
        type,
        preview: URL.createObjectURL(file),
      });
    }

    setTreatmentPhotos((previousPhotos) => [...previousPhotos, ...newPhotos]);
    event.target.value = '';
    setTreatmentMessage(null);
  };

  const removeTreatmentPhoto = (indexToRemove: number) => {
    setTreatmentPhotos((previousPhotos) => {
      const photo = previousPhotos[indexToRemove];
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return previousPhotos.filter((_, index) => index !== indexToRemove);
    });
    setTreatmentMessage(null);
  };

  const now = new Date();
  const nextAppointment = appointments
    .filter((appointment) => new Date(appointment.startTime).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  const visitDates = appointments
    .map((appointment) => new Date(appointment.startTime))
    .sort((a, b) => b.getTime() - a.getTime());

  const latestVisitDate = visitDates.length > 0 ? visitDates[0] : null;
  const previousVisitDate = visitDates.length > 1 ? visitDates[1] : null;

  const daysSinceLastVisit = latestVisitDate && previousVisitDate
    ? Math.floor((latestVisitDate.getTime() - previousVisitDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const latestThreeAppointments = appointments.slice(0, 3);
  const olderAppointments = appointments.slice(3);
  const activeBuiltInFlags = (client?.clinicalFlags ?? [])
    .map((flag) => builtInFlagLabels[flag])
    .filter((flag): flag is string => Boolean(flag));
  const activeCustomFlags = client?.customClinicalFlags ?? [];
  const visibleFlags = [...activeBuiltInFlags, ...activeCustomFlags];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">Skjólstæðingayfirlit</h1>
          {client && (
            <div className="mt-1 space-y-2">
              <p className="text-sm font-medium text-gray-900">{client.name}</p>
              {(overviewVisibility.showKennitala || overviewVisibility.showPhone) && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  {overviewVisibility.showKennitala && <span>KT: {client.kennitala ?? '—'}</span>}
                  {overviewVisibility.showKennitala && overviewVisibility.showPhone && <span>•</span>}
                  {overviewVisibility.showPhone && (
                    <a href={`tel:${formatPhone(client.phone)}`} className="font-medium text-blue-700">Sími: {client.phone}</a>
                  )}
                </div>
              )}

              {overviewVisibility.showFlags && visibleFlags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {visibleFlags.map((flag) => (
                    <span key={flag} className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">
                      {flag}
                    </span>
                  ))}
                </div>
              )}

              <div>
                <Link href={`/clients/${client.id}/edit`}>
                  <Button size="sm" variant="outline">Breyta</Button>
                </Link>
              </div>
            </div>
          )}

        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-3 px-4 py-3">
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
              <CardContent className="space-y-3">
                <div className="border-b border-gray-200" role="tablist" aria-label="Yfirlitsflipar">
                  <button
                    type="button"
                    onClick={() => setActiveTab('treatment')}
                    role="tab"
                    aria-selected={activeTab === 'treatment'}
                    className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'treatment' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
                  >
                    Meðferð
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    role="tab"
                    aria-selected={activeTab === 'history'}
                    className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'history' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
                  >
                    Saga
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('notes')}
                    role="tab"
                    aria-selected={activeTab === 'notes'}
                    className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${activeTab === 'notes' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
                  >
                    Til minnis
                  </button>
                </div>

                {activeTab === 'treatment' ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-700">S - Huglægt (hvað skjólstæðingur segir)</p>
                      <textarea
                        value={soapS}
                        onChange={(event) => setSoapS(event.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Dæmi: Verkur í hæl síðustu 2 vikur, verstur á morgnana og við fyrstu skref."
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-700">O - Hlutlægt (það sem þú sérð/mælir)</p>
                      <textarea
                        value={soapO}
                        onChange={(event) => setSoapO(event.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Dæmi: Eymsli við palpation undir hæl, engin bólga, húð heil."
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-700">A - Mat (klínískt mat/greining)</p>
                      <textarea
                        value={soapA}
                        onChange={(event) => setSoapA(event.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Dæmi: Líklegt plantar fasciitis, vægt til miðlungs, engin rauð flögg."
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-700">P - Áætlun (meðferð og næstu skref)</p>
                      <textarea
                        value={soapP}
                        onChange={(event) => setSoapP(event.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Dæmi: Fræðsla + teygjuæfingar daglega, innlegg ráðlögð, endurmat eftir 2 vikur."
                      />
                    </div>

                    <div className="rounded-lg border border-gray-200 p-3">
                      <p className="text-xs font-medium text-gray-700">Myndir tengdar meðferð</p>
                      <p className="mt-1 text-xs text-gray-500">Veldu myndir úr tæki eða taktu mynd beint í síma.</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                          Taka mynd
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(event) => handleTreatmentPhotoAdd(event, 'AFTER')}
                          />
                        </label>
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                          Bæta við mynd
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(event) => handleTreatmentPhotoAdd(event, 'AFTER')}
                          />
                        </label>
                      </div>

                      {treatmentPhotos.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {treatmentPhotos.map((photo, index) => (
                            <div key={`${photo.file.name}-${index}`} className="relative overflow-hidden rounded-lg border border-gray-200">
                              <Image
                                src={photo.preview}
                                alt={`Meðferðarmynd ${index + 1}`}
                                width={160}
                                height={120}
                                className="h-24 w-full object-cover"
                                unoptimized
                              />
                              <button
                                type="button"
                                onClick={() => removeTreatmentPhoto(index)}
                                className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white"
                              >
                                Fjarlægja
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={saveTreatment} disabled={savingTreatment}>
                        {savingTreatment ? 'Vistar...' : 'Vista meðferð'}
                      </Button>
                      {treatmentMessage && <p className="text-xs text-gray-600">{treatmentMessage}</p>}
                    </div>
                  </div>
                ) : null}

                {activeTab === 'history' ? (
                  <div className="space-y-4">
                    <div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Tími frá síðustu komu</p>
                          <p className="text-lg font-semibold text-gray-900">{daysSinceLastVisit !== null ? formatWeeksAndDays(daysSinceLastVisit) : '—'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-800">Síðustu 3 heimsóknir</p>
                      {latestThreeAppointments.length === 0 ? (
                        <p className="text-sm text-gray-600">Engar fyrri meðferðir skráðar.</p>
                      ) : (
                        <div className="space-y-2">
                          {latestThreeAppointments.map((appointment) => (
                            <div key={appointment.id} className="rounded-lg border border-gray-200 px-3 py-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-gray-900">{formatDateTime(appointment.startTime)}</p>
                                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                  {formatBookedService(appointment)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-gray-600">Staða: {appointment.status}</p>
                              {(() => {
                                const latestVisit = appointmentDetailsById[appointment.id]?.visits?.[0];

                                if (!latestVisit) {
                                  return <p className="mt-1 text-xs text-gray-700">Engin SOAP skráning.</p>;
                                }

                                const soapLines = [
                                  latestVisit.soapS ? `S: ${latestVisit.soapS}` : null,
                                  latestVisit.soapO ? `O: ${latestVisit.soapO}` : null,
                                  latestVisit.soapA ? `A: ${latestVisit.soapA}` : null,
                                  latestVisit.soapP ? `P: ${latestVisit.soapP}` : null,
                                ].filter((line): line is string => Boolean(line));

                                return (
                                  <div className="mt-1 space-y-1 text-xs text-gray-700">
                                    {soapLines.length > 0 ? soapLines.map((line) => <p key={line}>{line}</p>) : <p>Engin SOAP skráning.</p>}
                                  </div>
                                );
                              })()}

                              {(() => {
                                const latestVisit = appointmentDetailsById[appointment.id]?.visits?.[0];
                                const photos = latestVisit?.photos?.filter((photo) => Boolean(photo.downloadUrl)) ?? [];

                                if (photos.length === 0) {
                                  return null;
                                }

                                return (
                                  <div className="mt-2 grid grid-cols-3 gap-2">
                                    {photos.map((photo) => (
                                      <Image
                                        key={photo.id}
                                        src={photo.downloadUrl as string}
                                        alt={`Mynd ${photo.type}`}
                                        width={120}
                                        height={80}
                                        className="h-16 w-full rounded-md object-cover"
                                        unoptimized
                                      />
                                    ))}
                                  </div>
                                );
                              })()}

                              <Link
                                href={`/appointments/${appointment.id}`}
                                className="mt-2 inline-flex text-xs font-medium text-blue-700 hover:text-blue-800"
                              >
                                Skoða heimsókn
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {olderAppointments.length > 0 ? (
                      <div className="space-y-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowOlderVisits((previous) => !previous)}
                        >
                          {showOlderVisits ? 'Sýna minna' : 'Sýna meira'}
                        </Button>

                        {showOlderVisits ? (
                          <div className="space-y-2">
                            {olderAppointments.map((appointment) => (
                              <Link
                                key={appointment.id}
                                href={`/appointments/${appointment.id}`}
                                className="block rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                              >
                                {formatDateTime(appointment.startTime)} · {formatBookedService(appointment)}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activeTab === 'notes' ? (
                  <div className="space-y-2">
                    <textarea
                      value={memoText}
                      onChange={(event) => {
                        setMemoText(event.target.value);
                        setMemoMessage(null);
                      }}
                      rows={5}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Skrifaðu minnispunkta um skjólstæðing..."
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={saveMemo} disabled={savingMemo}>
                        {savingMemo ? 'Vistar...' : 'Vista minnispunkt'}
                      </Button>
                      {memoMessage && <p className="text-xs text-gray-600">{memoMessage}</p>}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
