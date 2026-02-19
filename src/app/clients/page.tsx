'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { authFetch } from '@/lib/api/client';

interface Client {
  id: string;
  name: string;
  phone: string;
  kennitala?: string | null;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [kennitala, setKennitala] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setKennitala('');
  };

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await authFetch(`/api/clients${query}`);
      const data = await res.json();
      setClients(data.clients ?? []);
    } catch (fetchError) {
      console.error('Error fetching clients:', fetchError);
      setError('Villa við að sækja skjólstæðinga');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !phone.trim()) {
      setError('Nafn og sími eru skyldureitir');
      return;
    }

    setSaving(true);
    try {
      const isEditing = Boolean(editingId);
      const endpoint = isEditing ? `/api/clients/${editingId}` : '/api/clients';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await authFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          kennitala: kennitala.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Ekki tókst að vista skjólstæðing');
        return;
      }

      resetForm();
      await fetchClients();
    } catch (submitError) {
      console.error('Error saving client:', submitError);
      setError('Villa við að vista skjólstæðing');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setName(client.name);
    setPhone(client.phone);
    setKennitala(client.kennitala ?? '');
    setError(null);
  };

  const handleDelete = async (clientId: string) => {
    const confirmed = window.confirm('Ertu viss um að þú viljir eyða þessum skjólstæðingi?');
    if (!confirmed) return;

    setDeletingId(clientId);
    setError(null);
    try {
      const res = await authFetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Ekki tókst að eyða skjólstæðingi');
        return;
      }

      if (editingId === clientId) {
        resetForm();
      }

      await fetchClients();
    } catch (deleteError) {
      console.error('Error deleting client:', deleteError);
      setError('Villa við að eyða skjólstæðingi');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Skjólstæðingar</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? 'Breyta skjólstæðingi' : 'Nýr skjólstæðingur'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nafn"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400"
              />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Símanúmer"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400"
              />
              <input
                type="text"
                value={kennitala}
                onChange={(e) => setKennitala(e.target.value)}
                placeholder="Kennitala (valfrjálst)"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Vistar...' : editingId ? 'Vista breytingar' : 'Stofna skjólstæðing'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Hætta við
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leita að skjólstæðingi</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nafn, sími eða kennitala"
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400"
            />

            {loading ? (
              <p className="text-gray-600">Hleður...</p>
            ) : clients.length === 0 ? (
              <p className="text-gray-600">Engir skjólstæðingar fundust.</p>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <div key={client.id} className="rounded-lg border border-gray-200 p-4">
                    <p className="font-semibold text-gray-900">{client.name}</p>
                    <p className="text-sm text-gray-600">{client.phone}</p>
                    {client.kennitala && <p className="text-sm text-gray-600">{client.kennitala}</p>}
                    <div className="mt-3 flex gap-2">
                      <Link href={`/clients/${client.id}`}>
                        <Button size="sm" variant="outline">Skoða</Button>
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(client)}>
                        Breyta
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={deletingId === client.id}
                        onClick={() => handleDelete(client.id)}
                      >
                        {deletingId === client.id ? 'Eyði...' : 'Eyða'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
