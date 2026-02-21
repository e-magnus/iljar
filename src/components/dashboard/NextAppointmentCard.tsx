import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { trackEvent } from '@/lib/analytics';
import { DashboardAppointment } from '@/components/dashboard/types';
import { formatTimeHHMM } from '@/lib/format/date';

interface NextAppointmentCardProps {
  appointment: DashboardAppointment | null;
  onMarkArrived: (id: string) => Promise<void>;
  onOpenReschedule: (id: string) => void;
}

function formatTime(dateString: string): string {
  return formatTimeHHMM(dateString);
}

function getRelativeMinutes(startTime: string): string {
  const deltaMs = new Date(startTime).getTime() - Date.now();
  const minutes = Math.round(deltaMs / 60000);

  if (minutes <= 0) {
    return 'Núna';
  }

  return `Eftir ${minutes} mín`;
}

function toShortName(fullName: string): string {
  const [firstName = '', lastName = ''] = fullName.split(' ');
  return `${firstName} ${lastName.charAt(0)}.`.trim();
}

function formatBookedService(appointment: DashboardAppointment): string {
  const serviceName = appointment.type ?? 'Almenn meðferð';
  const durationMinutes = Math.max(
    0,
    Math.round((new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) / 60000)
  );

  if (durationMinutes <= 0) {
    return serviceName;
  }

  return `${serviceName} (${durationMinutes} mín)`;
}

export function NextAppointmentCard({ appointment, onMarkArrived, onOpenReschedule }: NextAppointmentCardProps) {
  if (!appointment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Næsti tími</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Engir tímar í dag.</p>
          <Link href="/booking" className="mt-4 inline-flex">
            <Button>Bæta við bókun</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Næsti tími</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">{getRelativeMinutes(appointment.startTime)}</p>
          <p className="text-xl font-semibold text-gray-900">
            {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
          </p>
          <p className="text-gray-800">{toShortName(appointment.client.name)}</p>
          <p className="text-sm text-gray-600">{formatBookedService(appointment)}</p>
          <p className="text-sm text-gray-600">Staða: {appointment.status}</p>
          <p className="text-sm text-gray-600">Greiðsla: Óaðgengilegt</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Link href={`/clients/${appointment.client.id}`}>
            <Button variant="outline" className="w-full">Opna skjólstæðing</Button>
          </Link>
          <Button
            className="w-full"
            onClick={async () => {
              trackEvent('mark_arrived', { source: 'next_appointment' });
              await onMarkArrived(appointment.id);
            }}
            disabled={appointment.status !== 'BOOKED'}
          >
            Merkja mætt
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              trackEvent('open_reschedule', { source: 'next_appointment' });
              onOpenReschedule(appointment.id);
            }}
          >
            Fresta / færa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
