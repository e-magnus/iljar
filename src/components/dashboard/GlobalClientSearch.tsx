'use client';

import { useEffect, useMemo, useState } from 'react';
import { authFetch } from '@/lib/api/client';

interface ClientResult {
  id: string;
  name: string;
  phone: string;
}

export function GlobalClientSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientResult[]>([]);
  const [loading, setLoading] = useState(false);

  const enabled = useMemo(() => query.trim().length >= 2, [query]);

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await authFetch(`/api/clients?search=${encodeURIComponent(query.trim())}`);
        if (!response.ok) {
          setResults([]);
          return;
        }

        const data = await response.json();
        setResults((data.clients ?? []).slice(0, 6));
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [enabled, query]);

  return (
    <div className="relative w-full max-w-md">
      <label htmlFor="dashboard-search" className="sr-only">Leita að skjólstæðingi</label>
      <input
        id="dashboard-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Leita í skjólstæðingum (nafn/sími)"
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900"
      />

      {enabled && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-sm text-gray-600">Leita...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-600">Engar niðurstöður.</p>
          ) : (
            <ul className="max-h-72 overflow-auto py-1">
              {results.map((client) => (
                <li key={client.id}>
                  <a href={`/clients/${client.id}`} className="block px-3 py-2 text-sm hover:bg-gray-50">
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="text-gray-600">{client.phone}</p>
                  </a>
                </li>
              ))}
              <li className="border-t border-gray-100 px-3 py-2 text-sm">
                <a href="/booking" className="font-medium text-blue-700 hover:text-blue-900">Bæta við bókun</a>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
