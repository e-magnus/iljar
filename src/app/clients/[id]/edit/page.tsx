'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { authFetch } from '@/lib/api/client';

type ClinicalFlag = 'ANTICOAGULANT' | 'DIABETES' | 'ALLERGY' | 'NEUROPATHY' | 'PACEMAKER' | 'OTHER';

const clinicalFlagMeta: Record<ClinicalFlag, { label: string; icon: string }> = {
  ANTICOAGULANT: { label: 'Blóðþynning', icon: '🩸' },
  DIABETES: { label: 'Sykursýki', icon: '🧪' },
  ALLERGY: { label: 'Ofnæmi', icon: '⚠️' },
  NEUROPATHY: { label: 'Taugakvilli', icon: '🦶' },
  PACEMAKER: { label: 'Gangráður', icon: '❤️' },
  OTHER: { label: 'Annað', icon: 'ℹ️' },
};

interface CustomClinicalFlagOption {
  label: string;
  icon: string;
}

function normalizeFlagLabel(value: string): string {
  return value.trim().toLocaleLowerCase('is');
}

function parseCustomFlagOptions(input: unknown): CustomClinicalFlagOption[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const parsed: CustomClinicalFlagOption[] = [];

  for (const item of input) {
    if (typeof item === 'string') {
      parsed.push({ label: item, icon: 'ℹ️' });
      continue;
    }

    const option = item as { label?: unknown; icon?: unknown };
    if (typeof option?.label !== 'string') {
      continue;
    }

    parsed.push({
      label: option.label,
      icon: typeof option.icon === 'string' ? option.icon : 'ℹ️',
    });
  }

  return parsed.filter((item) => item.label !== '__FLAGS_CONFIGURED_V1__');
}

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = params.id;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [kennitala, setKennitala] = useState('');
  const [clinicalFlags, setClinicalFlags] = useState<ClinicalFlag[]>([]);
  const [availableFlags, setAvailableFlags] = useState<CustomClinicalFlagOption[]>([]);
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [flagClinicalMap, setFlagClinicalMap] = useState<Record<string, ClinicalFlag | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClient() {
      setLoading(true);
      setError(null);

      try {
        const [response, settingsResponse] = await Promise.all([
          authFetch(`/api/clients/${clientId}`),
          authFetch('/api/settings'),
        ]);

        if (response.status === 404) {
          setNotFound(true);
          return;
        }

        const data = await response.json();
        const settingsData = settingsResponse.ok ? await settingsResponse.json() : null;

        if (!response.ok) {
          setError(data?.error ?? 'Ekki tókst að sækja skjólstæðing');
          return;
        }

        setName(data.client?.name ?? '');
        setPhone(data.client?.phone ?? '');
        setKennitala(data.client?.kennitala ?? '');
        const clientClinicalFlags = (data.client?.clinicalFlags ?? []) as ClinicalFlag[];
        setClinicalFlags(clientClinicalFlags);

        const availableCustomFlags = parseCustomFlagOptions(settingsData?.clinical?.customFlags);
        const clientCustomFlags = [...(data.client?.customClinicalFlags ?? [])];

        const clinicalByIcon = new Map<string, ClinicalFlag>(
          (Object.keys(clinicalFlagMeta) as ClinicalFlag[]).map((key) => [clinicalFlagMeta[key].icon, key])
        );
        const clinicalByLabel = new Map<string, ClinicalFlag>(
          (Object.keys(clinicalFlagMeta) as ClinicalFlag[]).map((key) => [normalizeFlagLabel(clinicalFlagMeta[key].label), key])
        );

        const optionMap: Record<string, ClinicalFlag | null> = {};
        for (const option of availableCustomFlags) {
          const normalized = normalizeFlagLabel(option.label);
          optionMap[normalized] = clinicalByLabel.get(normalized) ?? clinicalByIcon.get(option.icon) ?? null;
        }

        const selectedClinicalOptions = clientClinicalFlags.map((flag) => {
          const match = availableCustomFlags.find((option) => optionMap[normalizeFlagLabel(option.label)] === flag);
          return {
            label: match?.label ?? clinicalFlagMeta[flag].label,
            icon: match?.icon ?? clinicalFlagMeta[flag].icon,
          };
        });
        const selectedClinicalLabels = selectedClinicalOptions.map((option) => option.label);

        const mergedFlags = Array.from(new Map(
          [
            ...availableCustomFlags,
            ...selectedClinicalOptions,
            ...clientCustomFlags.map((label: string) => ({ label, icon: 'ℹ️' })),
          ].map((flag) => [normalizeFlagLabel(flag.label), flag])
        ).values());

        const mergedOptionMap: Record<string, ClinicalFlag | null> = {};
        for (const option of mergedFlags) {
          const normalized = normalizeFlagLabel(option.label);
          mergedOptionMap[normalized] = clinicalByLabel.get(normalized) ?? clinicalByIcon.get(option.icon) ?? null;
        }

        setAvailableFlags(mergedFlags);
        setFlagClinicalMap(mergedOptionMap);
        setSelectedFlags(Array.from(new Set([...selectedClinicalLabels, ...clientCustomFlags])));
      } catch (fetchError) {
        console.error('Error fetching client:', fetchError);
        setError('Villa kom upp við að sækja skjólstæðing');
      } finally {
        setLoading(false);
      }
    }

    if (clientId) {
      fetchClient();
    }
  }, [clientId]);

  const toggleFlag = (label: string) => {
    const normalized = normalizeFlagLabel(label);
    const mappedClinicalFlag = flagClinicalMap[normalized] ?? null;

    setSelectedFlags((previous) => (
      previous.includes(label)
        ? previous.filter((value) => value !== label)
        : [...previous, label]
    ));

    if (mappedClinicalFlag) {
      setClinicalFlags((previous) => (
        previous.includes(mappedClinicalFlag)
          ? previous.filter((value) => value !== mappedClinicalFlag)
          : [...previous, mappedClinicalFlag]
      ));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !phone.trim()) {
      setError('Nafn og sími eru skyldureitir');
      return;
    }

    setSaving(true);

    try {
      const selectedCustomFlags = selectedFlags.filter((label) => {
        const mappedClinicalFlag = flagClinicalMap[normalizeFlagLabel(label)] ?? null;
        return mappedClinicalFlag === null;
      });

      const response = await authFetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          kennitala: kennitala.trim() || null,
          clinicalFlags,
          customClinicalFlags: selectedCustomFlags,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? 'Ekki tókst að vista breytingar');
        return;
      }

      router.push('/clients');
    } catch (submitError) {
      console.error('Error updating client:', submitError);
      setError('Villa við að vista breytingar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-4 flex items-center gap-4">
          <Link href="/clients" className="text-sm font-medium text-blue-700 hover:text-blue-900">
            ← Til baka
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Breyta skjólstæðingi</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-600">Hleð skjólstæðingi...</p>
            ) : notFound ? (
              <p className="text-sm text-red-600">Skjólstæðingur fannst ekki.</p>
            ) : (
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

                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-sm font-medium text-gray-800">Flögg</p>

                  {availableFlags.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-600">Engin flögg í stillingum.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {availableFlags.map((flag) => {
                        const isSelected = selectedFlags.includes(flag.label);

                        return (
                          <label key={flag.label} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleFlag(flag.label)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <span>{flag.icon} {flag.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={saving} className="bg-green-600 text-white hover:bg-green-700 focus:ring-green-500">
                    {saving ? 'Vistar...' : 'Vista breytingar'}
                  </Button>
                  <Link href="/clients">
                    <Button type="button" variant="outline">Hætta við</Button>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
