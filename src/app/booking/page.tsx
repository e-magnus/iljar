'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

export default function BookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Select Date, 2: Select Slot, 3: Select Client, 4: Confirm
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch clients on mount
  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch('/api/clients');
        const data = await res.json();
        setClients(data.clients);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    }
    fetchClients();
  }, []);

  // Fetch slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      async function fetchSlots() {
        setLoading(true);
        try {
          const res = await fetch(`/api/slots?date=${selectedDate}`);
          const data = await res.json();
          setSlots(data.slots);
        } catch (error) {
          console.error('Error fetching slots:', error);
        } finally {
          setLoading(false);
        }
      }
      fetchSlots();
    }
  }, [selectedDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedSlot(null);
    if (e.target.value) {
      setStep(2);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setStep(4);
  };

  const handleConfirm = async () => {
    if (!selectedSlot || !selectedClient) return;

    setLoading(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          type: 'Follow-up',
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
      setLoading(false);
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

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Bóka tíma</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`h-1 w-20 mx-2 ${
                      step > s ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span>Dagsetning</span>
            <span>Tími</span>
            <span>Skjólstæðingur</span>
            <span>Staðfesta</span>
          </div>
        </div>

        {/* Step 1: Select Date */}
        {step >= 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>1. Veldu dagsetningu</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={handleDateChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {selectedDate && (
                <p className="mt-2 text-sm text-gray-600">
                  Valinn dagur: {formatDate(selectedDate)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Slot */}
        {step >= 2 && selectedDate && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>2. Veldu tíma</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-gray-600">Hleður...</p>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {slots.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => handleSlotSelect(slot)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        selectedSlot?.start === slot.start
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {formatTime(slot.start)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  Engir lausir tímar þennan dag
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select Client */}
        {step >= 3 && selectedSlot && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>3. Veldu skjólstæðing</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="text"
                placeholder="Leita að nafni eða símanúmeri..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            </CardContent>
          </Card>
        )}

        {/* Step 4: Confirm */}
        {step >= 4 && selectedClient && selectedSlot && (
          <Card>
            <CardHeader>
              <CardTitle>4. Staðfesta bókun</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Skjólstæðingur</p>
                  <p className="text-lg font-semibold">{selectedClient.name}</p>
                  <p className="text-sm text-gray-600">{selectedClient.phone}</p>
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
              </div>
              <div className="mt-6 flex gap-4">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1"
                >
                  Breyta
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Bókar...' : 'Staðfesta bókun'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
