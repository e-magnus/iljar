'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { authFetch } from '@/lib/api/client';

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [kennitala, setKennitala] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !phone.trim()) {
      setError('Nafn og sími eru skyldureitir');
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          kennitala: kennitala.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Ekki tókst að vista skjólstæðing');
        return;
      }

      router.push('/clients');
    } catch (submitError) {
      console.error('Error saving client:', submitError);
      setError('Villa við að vista skjólstæðing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/clients" className="text-sm font-medium text-blue-700 hover:text-blue-900">
            ← Til baka
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nýskráning skjólstæðings</CardTitle>
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

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <Button type="submit" disabled={saving} className="bg-green-600 text-white hover:bg-green-700 focus:ring-green-500">
                {saving ? 'Vistar...' : 'Nýskráning'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
