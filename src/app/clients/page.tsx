'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useEffect, useMemo, useState } from 'react';
import { authFetch } from '@/lib/api/client';

interface Client {
  id: string;
  name: string;
  phone: string;
  kennitala?: string | null;
}

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const query = useMemo(() => search.trim(), [search]);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError('');

      try {
        const url = query
          ? `/api/clients?search=${encodeURIComponent(query)}`
          : '/api/clients';
        const response = await authFetch(url);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error ?? 'Gat ekki sótt skjólstæðinga.');
          setClients([]);
          return;
        }

        setClients(data.clients ?? []);
      } catch {
        setError('Villa kom upp við að sækja skjólstæðinga.');
        setClients([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    setActiveIndex(clients.length > 0 ? 0 : -1);
  }, [clients]);

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (clients.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % clients.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? clients.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < clients.length) {
        event.preventDefault();
        router.push(`/clients/${clients[activeIndex].id}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-8">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Skjólstæðingar</h1>

        <Card>
          <CardContent className="space-y-4">
            <div className="sticky top-12 z-10 -mx-4 border-b border-gray-200 bg-gray-50 px-4 pb-3 pt-1 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
              <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Leita að skjólstæðingi (nafn/sími/kennitala)"
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 placeholder-gray-400"
              />
              <Link href="/clients/new" className="hidden sm:block sm:w-auto">
                <Button className="w-full bg-green-600 text-white hover:bg-green-700 focus:ring-green-500">
                  Nýskráning
                </Button>
              </Link>
            </div>
            </div>

            {loading ? (
              <p className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">Leita...</p>
            ) : error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">{error}</p>
            ) : clients.length === 0 ? (
              <p className="rounded-lg border border-gray-200 bg-white px-3 py-4 text-sm text-gray-600">Engir skjólstæðingar fundust.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600">
                  {clients.length} niðurstöður
                </div>
                <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-auto">
                  {clients.map((client, index) => (
                    <li key={client.id}>
                      <div
                        className={`flex items-center justify-between gap-3 px-4 py-4 ${index === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <Link href={`/clients/${client.id}`} className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">{client.name}</p>
                          <p className="text-sm text-gray-600">{client.phone}</p>
                          {client.kennitala ? (
                            <p className="text-xs text-gray-500">Kt: {client.kennitala}</p>
                          ) : null}
                        </Link>

                        <Link href={`/clients/${client.id}/edit`}>
                          <Button size="sm" variant="outline">Breyta</Button>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
          <Link href="/clients/new" className="block">
            <Button className="w-full bg-green-600 text-white hover:bg-green-700 focus:ring-green-500">
              Nýskráning
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
