import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DashboardAppointment } from '@/components/dashboard/types';
import { trackEvent } from '@/lib/analytics';

interface TodayTimelineProps {
  appointments: DashboardAppointment[];
  onMarkCompleted: (id: string) => Promise<void>;
  onMarkNoShow: (id: string) => Promise<void>;
}

function formatTime(dateString: string): string {
  return new Intl.DateTimeFormat('is-IS', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function shortName(name: string): string {
  const [first = '', last = ''] = name.split(' ');
  return `${first} ${last.charAt(0)}.`.trim();
}

export function TodayTimeline({ appointments, onMarkCompleted, onMarkNoShow }: TodayTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Í dag</CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center">
            <p className="text-gray-600">Engir tímar í dag.</p>
            <a href="/booking" className="mt-3 inline-flex">
              <Button>Bæta við bókun</Button>
            </a>
          </div>
        ) : (
          <ul className="space-y-3">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {formatTime(appointment.startTime)} · {shortName(appointment.client.name)}
                    </p>
                    <p className="text-sm text-gray-600">{appointment.type ?? 'Almenn meðferð'}</p>
                    <p className="text-xs text-gray-600">Staða: {appointment.status} · Greiðsla: Óaðgengilegt</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        trackEvent('mark_completed', { source: 'timeline' });
                        await onMarkCompleted(appointment.id);
                      }}
                      disabled={appointment.status === 'COMPLETED'}
                    >
                      Lokið
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        await onMarkNoShow(appointment.id);
                      }}
                      disabled={appointment.status === 'NO_SHOW'}
                    >
                      Ekki mætt
                    </Button>
                    <a href={`tel:${appointment.client.phone}`}>
                      <Button size="sm" variant="outline">Hringja</Button>
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
