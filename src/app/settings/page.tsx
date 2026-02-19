import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Stillingar</h1>

        <Card>
          <CardHeader>
            <CardTitle>Kerfisstillingar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">Grunnstillingar MVP eru virkar. Frekari stillingar verða bættar við í næstu útgáfu.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
