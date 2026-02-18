'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';

interface SOAPTemplate {
  name: string;
  s: string;
  o: string;
  a: string;
  p: string;
}

const templates: SOAPTemplate[] = [
  {
    name: 'Plantar Fasciitis',
    s: 'Patient reports heel pain, worse in the morning.',
    o: 'Tenderness at plantar fascia insertion. No swelling.',
    a: 'Plantar fasciitis, mild.',
    p: 'Stretching exercises. Follow-up in 2 weeks.',
  },
  {
    name: 'Ingrown Toenail',
    s: 'Patient reports pain in big toe, redness noted.',
    o: 'Inflammation at nail border. Minimal drainage.',
    a: 'Ingrown toenail, right hallux.',
    p: 'Nail trimming performed. Advised on proper nail care.',
  },
  {
    name: 'General Follow-up',
    s: 'Patient reports improvement since last visit.',
    o: 'Examination shows normal findings.',
    a: 'Condition improving as expected.',
    p: 'Continue current treatment plan.',
  },
];

function NewVisitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');

  const [soapS, setSoapS] = useState('');
  const [soapO, setSoapO] = useState('');
  const [soapA, setSoapA] = useState('');
  const [soapP, setSoapP] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleTemplateSelect = (template: SOAPTemplate) => {
    setSoapS(template.s);
    setSoapO(template.o);
    setSoapA(template.a);
    setSoapP(template.p);
    setShowTemplates(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointmentId) {
      alert('Appointment ID missing');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          soapS,
          soapO,
          soapA,
          soapP,
        }),
      });

      if (res.ok) {
        router.push(`/appointments/${appointmentId}`);
      } else {
        alert('Villa við að vista heimsókn');
      }
    } catch (error) {
      console.error('Error saving visit:', error);
      alert('Villa við að vista heimsókn');
    } finally {
      setLoading(false);
    }
  };

  if (!appointmentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Appointment ID vantar</div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Sniðmát</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              variant="outline"
              className="w-full"
            >
              {showTemplates ? 'Fela sniðmát' : 'Sýna sniðmát'}
            </Button>
            {showTemplates && (
              <div className="mt-4 space-y-2">
                {templates.map((template, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full p-3 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <p className="font-semibold">{template.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{template.s}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SOAP Fields */}
        <Card>
          <CardHeader>
            <CardTitle>S - Subjective (Huglægt)</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Hvað segir skjólstæðingur? Einkenni, kvartanir, saga.
            </p>
          </CardHeader>
          <CardContent>
            <textarea
              value={soapS}
              onChange={(e) => setSoapS(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="T.d. Sjúklingur kvartar yfir verkjum í hæl..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>O - Objective (Hlutlægt)</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Hvað sést við skoðun? Mælingar, athuganir.
            </p>
          </CardHeader>
          <CardContent>
            <textarea
              value={soapO}
              onChange={(e) => setSoapO(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="T.d. Væg bólga greinist. Eðlileg hreyfigeta..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>A - Assessment (Mat)</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Greining, niðurstaða matsins.
            </p>
          </CardHeader>
          <CardContent>
            <textarea
              value={soapA}
              onChange={(e) => setSoapA(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="T.d. Líkleg plantarfasciitis..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>P - Plan (Áætlun)</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Meðferðaráætlun, næstu skref.
            </p>
          </CardHeader>
          <CardContent>
            <textarea
              value={soapP}
              onChange={(e) => setSoapP(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="T.d. Teygjanæfingar. Endurmat eftir 2 vikur..."
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            type="button"
            onClick={() => router.back()}
            variant="outline"
            className="flex-1"
          >
            Hætta við
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Vistar...' : 'Vista heimsókn'}
          </Button>
        </div>
      </form>
    </main>
  );
}

export default function NewVisitPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Skrá heimsókn</h1>
            <p className="text-sm text-gray-600">SOAP format</p>
          </div>
          <Button onClick={() => router.back()} variant="outline">
            Hætta við
          </Button>
        </div>
      </header>

      <Suspense fallback={<div className="text-center py-8">Hleður...</div>}>
        <NewVisitForm />
      </Suspense>
    </div>
  );
}
