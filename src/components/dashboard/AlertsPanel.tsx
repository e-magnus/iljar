import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DashboardAlert } from '@/components/dashboard/types';

interface AlertsPanelProps {
  alerts: DashboardAlert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const visible = alerts.slice(0, 3);
  const hiddenCount = Math.max(0, alerts.length - visible.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Viðvaranir</CardTitle>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-gray-600">Engar viðvaranir eins og er.</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((alert) => (
              <li key={alert.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">{alert.title}</p>
                <p className="text-sm text-amber-800">{alert.description}</p>
              </li>
            ))}
          </ul>
        )}

        {hiddenCount > 0 && (
          <button className="mt-3 text-sm font-medium text-blue-700 hover:text-blue-900">
            Sjá allar (+{hiddenCount})
          </button>
        )}
      </CardContent>
    </Card>
  );
}
