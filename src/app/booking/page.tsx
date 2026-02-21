'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { authFetch } from '@/lib/api/client';
import { formatIcelandicDayLabel, formatTimeHHMM } from '@/lib/format/date';

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  displayOrder: number;
  isDefault: boolean;
}

interface DayAppointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  client: {
    id: string;
    name: string;
  };
}

function formatLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthStart(date: Date): Date {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function formatAvailableHours(hours: number): string {
  const formatter = new Intl.NumberFormat('is-IS', {
    minimumFractionDigits: Number.isInteger(hours) ? 0 : 1,
    maximumFractionDigits: 1,
  });

  return `${formatter.format(hours)} klst`;
}

function availabilityTone(hours: number): {
  cell: string;
  text: string;
} {
  if (hours <= 1) {
    return {
      cell: 'border-rose-200 bg-rose-50 hover:border-rose-300',
      text: 'text-rose-700',
    };
  }

  if (hours <= 3) {
    return {
      cell: 'border-amber-200 bg-amber-50 hover:border-amber-300',
      text: 'text-amber-700',
    };
  }

  return {
    cell: 'border-emerald-200 bg-emerald-50 hover:border-emerald-300',
    text: 'text-emerald-700',
  };
}

export default function BookingPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [dayAppointments, setDayAppointments] = useState<DayAppointment[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingDayAvailability, setLoadingDayAvailability] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [prefillTime, setPrefillTime] = useState<string>('');
  const [prefillClientId, setPrefillClientId] = useState<string>('');
  const [dayAvailability, setDayAvailability] = useState<Record<string, number>>({});
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => monthStart(new Date()));
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientKennitala, setNewClientKennitala] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedService = services.find((service) => service.id === selectedServiceId) ?? null;

  // Fetch clients on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [clientsRes, servicesRes] = await Promise.all([
          authFetch('/api/clients'),
          authFetch('/api/services'),
        ]);
        const clientsData = await clientsRes.json();
        const servicesData = await servicesRes.json();

        setClients(clientsData.clients ?? []);
        const loadedServices: Service[] = servicesData.services ?? [];
        setServices(loadedServices);
        if (loadedServices.length > 0) {
          setSelectedServiceId(loadedServices[0].id);
        }
      } catch (error) {
        console.error('Error fetching initial booking data:', error);
      }
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryDate = params.get('date');
    const queryTime = params.get('time');
    const queryClientId = params.get('clientId');

    if (queryDate) {
      setSelectedDate(queryDate);
      setVisibleMonth(monthStart(new Date(`${queryDate}T00:00:00`)));
    }

    if (queryTime) {
      setPrefillTime(queryTime);
    }

    if (queryClientId) {
      setPrefillClientId(queryClientId);
    }
  }, []);

  useEffect(() => {
    if (!prefillClientId || clients.length === 0) {
      return;
    }

    const client = clients.find((item) => item.id === prefillClientId);
    if (client) {
      setSelectedClient(client);
      setClientMode('existing');
    }
  }, [prefillClientId, clients]);

  useEffect(() => {
    const activeServiceDuration = selectedService?.durationMinutes;
    if (!selectedDate || !activeServiceDuration) {
      setSlots([]);
      return;
    }

    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const params = new URLSearchParams({
          date: selectedDate,
          slotLength: String(activeServiceDuration),
        });
        const res = await authFetch(`/api/slots?${params.toString()}`);
        const data = await res.json();
        setSlots(data.slots ?? []);
      } catch (error) {
        console.error('Error fetching slots:', error);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [selectedDate, selectedService]);

  useEffect(() => {
    if (!selectedDate) {
      setDayAppointments([]);
      return;
    }

    async function fetchDayAppointments() {
      setLoadingAppointments(true);
      try {
        const response = await authFetch(`/api/appointments?date=${selectedDate}`);
        const data = await response.json();
        if (!response.ok) {
          setDayAppointments([]);
          return;
        }

        setDayAppointments((data.appointments ?? []).filter((item: DayAppointment) => item.status !== 'CANCELLED'));
      } catch (error) {
        console.error('Error fetching day appointments:', error);
        setDayAppointments([]);
      } finally {
        setLoadingAppointments(false);
      }
    }

    fetchDayAppointments();
  }, [selectedDate]);

  useEffect(() => {
    const activeServiceDuration = selectedService?.durationMinutes;
    if (!activeServiceDuration) {
      setDayAvailability({});
      return;
    }
    const serviceDuration = activeServiceDuration;

    async function fetchDayAvailability() {
      setLoadingDayAvailability(true);
      try {
        const year = visibleMonth.getFullYear();
        const month = visibleMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dateList = Array.from({ length: daysInMonth }, (_, index) => {
          const date = new Date(year, month, index + 1);
          return formatLocalDateInput(date);
        });

        const responses = await Promise.all(
          dateList.map(async (date) => {
            const params = new URLSearchParams({
              date,
              slotLength: String(serviceDuration),
            });

            const response = await authFetch(`/api/slots?${params.toString()}`);
            if (!response.ok) {
              return { date, availableHours: 0 };
            }

            const data = await response.json();
            const slotCount = (data.slots ?? []).length;
            return { date, availableHours: (slotCount * serviceDuration) / 60 };
          })
        );

        const nextAvailability = responses.reduce<Record<string, number>>((accumulator, current) => {
          accumulator[current.date] = current.availableHours;
          return accumulator;
        }, {});

        setDayAvailability(nextAvailability);
      } catch (error) {
        console.error('Error fetching day availability:', error);
        setDayAvailability({});
      } finally {
        setLoadingDayAvailability(false);
      }
    }

    fetchDayAvailability();
  }, [selectedService, visibleMonth]);

  useEffect(() => {
    if (!prefillTime || slots.length === 0) {
      return;
    }

    const matchingSlot = slots.find((slot) => {
      const date = new Date(slot.start);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}` === prefillTime;
    });

    if (matchingSlot) {
      setSelectedSlot(matchingSlot);
    }
  }, [prefillTime, slots]);

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setSelectedSlot(null);
    setSelectedClient(null);
  };

  const handleDateQuickSelect = (date: string) => {
    setSelectedDate(date);
    setVisibleMonth(monthStart(new Date(`${date}T00:00:00`)));
    setSelectedSlot(null);
    setSelectedClient(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
  };

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedService) {
      return;
    }

    setSubmitting(true);
    try {
      let activeClient = selectedClient;

      if (clientMode === 'new') {
        if (!newClientName.trim() || !newClientPhone.trim()) {
          alert('Nafn og sími eru nauðsynleg til að skrá nýjan skjólstæðing.');
          return;
        }

        const clientRes = await authFetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newClientName.trim(),
            phone: newClientPhone.trim(),
            kennitala: newClientKennitala.trim() || undefined,
          }),
        });

        const clientData = await clientRes.json();
        if (!clientRes.ok) {
          alert(clientData.error ?? 'Villa við skráningu skjólstæðings');
          return;
        }

        const createdClient: Client = clientData.client;
        activeClient = createdClient;
        setSelectedClient(createdClient);
        setClients((current) => [...current, createdClient].sort((a, b) => a.name.localeCompare(b.name, 'is')));
        setClientMode('existing');
      }

      if (!activeClient) {
        alert('Veldu skjólstæðing eða skráðu nýjan áður en þú staðfestir.');
        return;
      }

      const res = await authFetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: activeClient.id,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          type: `${selectedService.name} (${selectedService.durationMinutes} mín)`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/appointments/${data.appointment.id}`);
      } else {
        alert('Villa við bókun');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Villa við bókun');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatIcelandicDayLabel(`${dateString}T00:00:00`);
  };

  const formatTime = (dateString: string) => {
    return formatTimeHHMM(dateString);
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = formatLocalDateInput(new Date());
  const monthLabel = new Intl.DateTimeFormat('is-IS', {
    month: 'long',
    year: 'numeric',
  }).format(visibleMonth);
  const firstWeekdayIndex = (visibleMonth.getDay() + 6) % 7;
  const visibleMonthDays = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const weekdayHeaders = ['Mán', 'Þri', 'Mið', 'Fim', 'Fös', 'Lau', 'Sun'];
  const progressStep = !selectedServiceId ? 1 : !selectedDate ? 2 : !selectedSlot ? 3 : 4;

  const timeEntries = [
    ...slots.map((slot) => ({
      kind: 'available' as const,
      startTime: slot.start,
      endTime: slot.end,
      slot,
    })),
    ...dayAppointments.map((appointment) => ({
      kind: 'booked' as const,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      appointment,
    })),
  ].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Bóka tíma</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="sticky top-0 z-20 -mx-4 mb-8 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    progressStep >= s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`h-1 w-20 mx-2 ${
                      progressStep > s ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span>Þjónusta</span>
            <span>Dagur</span>
            <span>Tími</span>
            <span>Skjólstæðingur</span>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Veldu þjónustu</CardTitle>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p>Engar þjónustur fundust.</p>
                <p className="mt-1">
                  Bættu við þjónustu undir{' '}
                  <Link href="/settings#services" className="font-medium underline">
                    Stillingar → Þjónustur
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <select
                value={selectedServiceId}
                onChange={(event) => handleServiceSelect(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} — {service.durationMinutes} mín
                  </option>
                ))}
              </select>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>2. Veldu dag í dagatali</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedServiceId ? (
              <p className="text-sm text-gray-600">Veldu fyrst þjónustu.</p>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const previousMonth = new Date(visibleMonth);
                      previousMonth.setMonth(previousMonth.getMonth() - 1);
                      setVisibleMonth(monthStart(previousMonth));
                    }}
                  >
                    ←
                  </Button>
                  <p className="text-sm font-semibold text-gray-700 capitalize">{monthLabel}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextMonth = new Date(visibleMonth);
                      nextMonth.setMonth(nextMonth.getMonth() + 1);
                      setVisibleMonth(monthStart(nextMonth));
                    }}
                  >
                    →
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500">
                  {weekdayHeaders.map((weekday) => (
                    <div key={weekday} className="py-1">
                      {weekday}
                    </div>
                  ))}
                </div>

                {loadingDayAvailability ? (
                  <p className="text-sm text-gray-600">Sæki fjölda lausra klukkustunda...</p>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstWeekdayIndex }).map((_, index) => (
                      <div key={`empty-${index}`} className="h-16 rounded-md" />
                    ))}

                    {Array.from({ length: visibleMonthDays }, (_, index) => {
                      const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index + 1);
                      const dateKey = formatLocalDateInput(date);
                      const isSelected = selectedDate === dateKey;
                      const availableHours = dayAvailability[dateKey] ?? 0;
                      const isPastDate = dateKey < today;
                      const isDisabled = isPastDate;
                      const tone = availabilityTone(availableHours);

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleDateQuickSelect(dateKey)}
                          className={`h-16 rounded-lg border px-1 py-1 text-center transition-colors ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50'
                              : isDisabled
                                ? 'border-gray-200 bg-gray-50 text-gray-400'
                                : tone.cell
                          }`}
                        >
                          <p className="text-sm font-semibold">{index + 1}</p>
                          <p className={`text-[11px] mt-0.5 ${availableHours > 0 ? tone.text : 'text-gray-400'}`}>
                            {formatAvailableHours(availableHours)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedDate && (
                  <p className="mt-2 text-sm text-gray-600">Valinn dagur: {formatDate(selectedDate)}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>3. Veldu tíma (lausir og bókaðir)</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-sm text-gray-600">Veldu dag í dagatalinu til að sjá tíma.</p>
            ) : loadingSlots || loadingAppointments ? (
              <p className="text-sm text-gray-600">Hleður tímum...</p>
            ) : timeEntries.length === 0 ? (
              <p className="text-sm text-gray-600">Engir tímar fundust þennan dag.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {timeEntries.map((entry) => {
                  if (entry.kind === 'available') {
                    return (
                      <button
                        key={`available-${entry.startTime}`}
                        onClick={() => handleSlotSelect(entry.slot)}
                        className={`p-3 rounded-lg border-2 transition-colors text-left ${
                          selectedSlot?.start === entry.slot.start
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        <p className="font-semibold">{formatTime(entry.startTime)}</p>
                        <p className="text-xs text-gray-600">Laus</p>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={`booked-${entry.appointment.id}`}
                      className="p-3 rounded-lg border border-gray-300 bg-gray-100 text-left"
                    >
                      <p className="font-semibold text-gray-700">{formatTime(entry.startTime)}</p>
                      <p className="text-xs text-gray-600">Bókað • {entry.appointment.client.name}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>4. Veldu skjólstæðing eða skráðu nýjan</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedSlot ? (
              <p className="text-sm text-gray-600">Veldu fyrst tíma til að halda áfram.</p>
            ) : (
              <>
                <div className="mb-4 flex gap-2">
                  <Button
                    type="button"
                    variant={clientMode === 'existing' ? 'primary' : 'outline'}
                    onClick={() => setClientMode('existing')}
                  >
                    Þekktur skjólstæðingur
                  </Button>
                  <Button
                    type="button"
                    variant={clientMode === 'new' ? 'primary' : 'outline'}
                    onClick={() => setClientMode('new')}
                  >
                    Nýr skjólstæðingur
                  </Button>
                </div>

                {clientMode === 'existing' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Leita að nafni eða símanúmeri..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {filteredClients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => handleClientSelect(client)}
                          className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                            selectedClient?.id === client.id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          <p className="font-semibold">{client.name}</p>
                          <p className="text-sm text-gray-600">{client.phone}</p>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Nafn"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="Sími"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newClientKennitala}
                      onChange={(e) => setNewClientKennitala(e.target.value)}
                      placeholder="Kennitala (valfrjálst)"
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {selectedSlot && (
          <Card>
            <CardHeader>
              <CardTitle>Staðfesta bókun</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Þjónusta</p>
                  <p className="text-lg font-semibold">
                    {selectedService ? `${selectedService.name} (${selectedService.durationMinutes} mín)` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Dagsetning</p>
                  <p className="text-lg font-semibold">{formatDate(selectedDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tími</p>
                  <p className="text-lg font-semibold">
                    {formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Skjólstæðingur</p>
                  {clientMode === 'existing' ? (
                    selectedClient ? (
                      <>
                        <p className="text-lg font-semibold">{selectedClient.name}</p>
                        <p className="text-sm text-gray-600">{selectedClient.phone}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">Enginn valinn</p>
                    )
                  ) : (
                    <p className="text-sm text-gray-600">Nýr skjólstæðingur verður skráður við staðfestingu.</p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex gap-4">
                <Button
                  onClick={() => {
                    setSelectedSlot(null);
                    setSelectedClient(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Breyta
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? 'Bókar...' : 'Staðfesta bókun'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
