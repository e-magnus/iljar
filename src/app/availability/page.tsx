'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { authFetch } from '@/lib/api/client';

interface AvailabilityRule {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

const weekdayNames = ['Sunnudagur', 'Mánudagur', 'Þriðjudagur', 'Miðvikudagur', 'Fimmtudagur', 'Föstudagur', 'Laugardagur'];

export default function AvailabilityPage() {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRules() {
      try {
        const res = await authFetch('/api/availability');
        const data = await res.json();
        setRules(data.rules ?? []);
      } catch (error) {
        console.error('Error fetching availability rules:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRules();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Vinnustundir</h1>

        <Card>
          <CardHeader>
            <CardTitle>Reglur</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600">Hleður...</p>
            ) : rules.length === 0 ? (
              <p className="text-gray-600">Engar reglur fundust.</p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                    <p className="font-medium text-gray-900">{weekdayNames[rule.weekday] ?? rule.weekday}</p>
                    <p className="text-gray-700">{rule.startTime} - {rule.endTime}</p>
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
