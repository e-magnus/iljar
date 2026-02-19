import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface PulseMetricsProps {
  dailyRevenue: number | null;
  weekAppointments: number | null;
  noShow30d: number | null;
}

function metricValue(value: number | null, formatter?: (value: number) => string): string {
  if (value === null) {
    return '—';
  }

  return formatter ? formatter(value) : String(value);
}

export function PulseMetrics({ dailyRevenue, weekAppointments, noShow30d }: PulseMetricsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rekstrarpúls</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-600">Dagsvelta</p>
            <p className="text-xl font-semibold text-gray-900">
              {metricValue(dailyRevenue, (value) => `${value.toLocaleString('is-IS')} kr.`)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-600">Tímar í viku</p>
            <p className="text-xl font-semibold text-gray-900">{metricValue(weekAppointments)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-600">No-show (30 dagar)</p>
            <p className="text-xl font-semibold text-gray-900">{metricValue(noShow30d)}</p>
          </div>
        </div>
        <a href="/settings" className="mt-3 inline-block text-sm font-medium text-blue-700 hover:text-blue-900">
          Sjá nánar
        </a>
      </CardContent>
    </Card>
  );
}
