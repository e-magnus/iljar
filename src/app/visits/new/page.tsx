'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { authFetch } from '@/lib/api/client';

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

interface Photo {
  file: File;
  type: 'BEFORE' | 'AFTER';
  preview: string;
}

function NewVisitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');

  const [soapS, setSoapS] = useState('');
  const [soapO, setSoapO] = useState('');
  const [soapA, setSoapA] = useState('');
  const [soapP, setSoapP] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  const handleTemplateSelect = (template: SOAPTemplate) => {
    setSoapS(template.s);
    setSoapO(template.o);
    setSoapA(template.a);
    setSoapP(template.p);
    setShowTemplates(false);
  };

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>, type: 'BEFORE' | 'AFTER') => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: Photo[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newPhotos.push({
        file,
        type,
        preview: URL.createObjectURL(file),
      });
    }

    setPhotos([...photos, ...newPhotos]);
  };

  const handlePhotoRemove = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const uploadPhoto = async (visitId: string, photo: Photo) => {
    // Get signed upload URL
    const urlRes = await authFetch('/api/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitId,
        filename: photo.file.name,
        contentType: photo.file.type,
        photoType: photo.type,
      }),
    });

    if (!urlRes.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { uploadUrl } = await urlRes.json();

    // Upload file to S3
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': photo.file.type,
      },
      body: photo.file,
    });

    if (!uploadRes.ok) {
      throw new Error('Failed to upload photo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointmentId) {
      alert('Appointment ID missing');
      return;
    }

    if (photos.length > 0 && !consentGiven) {
      alert('Vinsamlegast staðfestu samþykki fyrir myndatöku');
      return;
    }

    setLoading(true);
    try {
      // Create visit
      const res = await authFetch('/api/visits', {
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

      if (!res.ok) {
        alert('Villa við að vista heimsókn');
        return;
      }

      const { visit } = await res.json();

      // Upload photos if any
      if (photos.length > 0) {
        for (const photo of photos) {
          await uploadPhoto(visit.id, photo);
        }
      }

      router.push(`/appointments/${appointmentId}`);
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
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500"
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
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500"
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
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500"
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
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              placeholder="T.d. Teygjanæfingar. Endurmat eftir 2 vikur..."
            />
          </CardContent>
        </Card>

        {/* Photo Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Myndir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Photo Grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={photo.preview}
                        alt={`${photo.type} ${index + 1}`}
                        width={200}
                        height={128}
                        className="w-full h-32 object-cover rounded-lg"
                        unoptimized
                      />
                      <div className="absolute top-2 left-2 px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded">
                        {photo.type}
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePhotoRemove(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Buttons */}
              <div className="flex gap-4">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handlePhotoAdd(e, 'BEFORE')}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" className="w-full" onClick={(e) => {
                    e.preventDefault();
                    (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                  }}>
                    📷 Fyrir mynd
                  </Button>
                </label>
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handlePhotoAdd(e, 'AFTER')}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" className="w-full" onClick={(e) => {
                    e.preventDefault();
                    (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                  }}>
                    📷 Eftir mynd
                  </Button>
                </label>
              </div>

              {/* Consent Checkbox */}
              {photos.length > 0 && (
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-700">
                    Ég staðfesti að skjólstæðingur hefur veitt samþykki fyrir myndatöku og geymslu mynda í tengslum við meðferð.
                  </span>
                </label>
              )}
            </div>
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
