'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { setSessionTokens } from '@/lib/auth/session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          totpToken: requires2FA ? totpToken : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSessionTokens(data.accessToken, data.refreshToken);
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        if (data.requires2FA) {
          setRequires2FA(true);
          setError('');
        } else {
          setError(data.error || 'Innskráning mistókst');
        }
      }
    } catch {
      setError('Villa við að tengjast þjóni');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">iljar</h1>
            <CardTitle>Innskráning</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Netfang
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={requires2FA}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="clinician@iljar.is"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Lykilorð
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={requires2FA}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="password123"
              />
            </div>

            {requires2FA && (
              <div>
                <label htmlFor="totp" className="block text-sm font-medium text-gray-700 mb-1">
                  2FA Kóði
                </label>
                <input
                  id="totp"
                  type="text"
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value)}
                  required
                  maxLength={6}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="123456"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Skrái inn...' : requires2FA ? 'Staðfesta 2FA' : 'Skrá inn'}
            </Button>

            {requires2FA && (
              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTotpToken('');
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-800"
              >
                Til baka
              </button>
            )}
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">Prufugögn:</p>
            <p className="text-sm text-blue-800">
              <strong>Netfang:</strong> clinician@iljar.is<br />
              <strong>Lykilorð:</strong> password123
            </p>
            <p className="text-xs text-blue-600 mt-2">
              (Búið til með <code className="bg-blue-100 px-1 rounded">npm run seed</code>)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
