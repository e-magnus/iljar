'use client';

import { useEffect, useMemo, useState } from 'react';
import Script from 'next/script';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { trackEvent } from '@/lib/analytics';

declare global {
  interface Window {
    onTurnstileVerified?: (token: string) => void;
  }
}

interface LeadPayload {
  name: string;
  email: string;
  phone: string;
  clinicName: string;
  captchaToken?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LeadForm() {
  const [form, setForm] = useState<LeadPayload>({
    name: '',
    email: '',
    phone: '',
    clinicName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    window.onTurnstileVerified = (token: string) => {
      setForm((prev) => ({ ...prev, captchaToken: token }));
    };

    return () => {
      delete window.onTurnstileVerified;
    };
  }, []);

  const isValid = useMemo(() => {
    const validEmail = emailRegex.test(form.email) && form.email.length <= 254;
    return Boolean(
      form.name.trim() &&
      form.phone.trim() &&
      form.clinicName.trim() &&
      validEmail
    );
  }, [form]);

  const onChange = (key: keyof LeadPayload, value: string) => {
    setSuccess(false);
    setError('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValid) {
      setError('Vinsamlegast fylltu út gilt netfang og alla skyldureiti.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'iljar-landing',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Ekki tókst að senda inn. Reyndu aftur síðar.');
        return;
      }

      trackEvent('submit_lead_form');
      setSuccess(true);
      setForm({ name: '', email: '', phone: '', clinicName: '' });
    } catch {
      setError('Villa kom upp við innsendingu. Reyndu aftur síðar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="lead-form" className="bg-gray-50 py-16">
      {turnstileSiteKey && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
      )}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>Skrá áhuga</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">Nafn</label>
                <input
                  id="name"
                  maxLength={120}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900"
                  value={form.name}
                  onChange={(e) => onChange('name', e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">Netfang</label>
                <input
                  id="email"
                  type="email"
                  maxLength={254}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900"
                  value={form.email}
                  onChange={(e) => onChange('email', e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">Sími</label>
                <input
                  id="phone"
                  maxLength={40}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900"
                  value={form.phone}
                  onChange={(e) => onChange('phone', e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="clinic" className="mb-1 block text-sm font-medium text-gray-700">Heiti stofu</label>
                <input
                  id="clinic"
                  maxLength={120}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900"
                  value={form.clinicName}
                  onChange={(e) => onChange('clinicName', e.target.value)}
                  required
                />
              </div>

              {turnstileSiteKey && (
                <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-callback="onTurnstileVerified" />
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-700">Takk! Við höfum samband innan skamms.</p>}

              <Button type="submit" disabled={loading || !isValid} className="w-full sm:w-auto">
                {loading ? 'Sendi...' : 'Senda inn'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
