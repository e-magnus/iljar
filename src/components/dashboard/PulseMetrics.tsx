import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface PulseMetricsProps {
  weekLabel: string;
  weekBooked: number;
  weekNoShow: number;
  weekFreeSlots: number;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export function PulseMetrics({ weekLabel, weekBooked, weekNoShow, weekFreeSlots, onPreviousWeek, onNextWeek }: PulseMetricsProps) {
  const match = weekLabel.match(/^(.*)\s\((.*)\)$/);
  const labelText = match ? match[1] : weekLabel;
  const rangeText = match ? match[2] : '';

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-center md:text-left leading-tight">
          <span className="block">{labelText}</span>
          {rangeText ? <span className="mt-1 block">{rangeText}</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3">
        <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPreviousWeek}
            aria-label="Fara viku til baka"
            className="m-1 h-8 min-w-8 rounded-md px-2"
          >
            ←
          </Button>

          <div className="flex flex-1 items-center justify-center gap-1 px-2 py-2" aria-label="Bókaðir tímar" title="Bókaðir tímar (mán-sun)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-gray-600" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18" />
              <path d="M8 3v4M16 3v4" />
            </svg>
            <span className="text-base font-semibold text-gray-900">{weekBooked}</span>
          </div>

          <div className="h-6 w-px bg-gray-200" aria-hidden />

          <div className="flex flex-1 items-center justify-center gap-1 px-2 py-2" aria-label="Lausir tímar" title="Lausir tímar (mán-sun)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-gray-600" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span className="text-base font-semibold text-gray-900">{weekFreeSlots}</span>
          </div>

          <div className="h-6 w-px bg-gray-200" aria-hidden />

          <div className="flex flex-1 items-center justify-center gap-1 px-2 py-2" aria-label="Skróp" title="Skróp / no-show (mán-sun)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-gray-600" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M6 6l12 12" />
            </svg>
            <span className="text-base font-semibold text-gray-900">{weekNoShow}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNextWeek}
            aria-label="Fara viku fram"
            className="m-1 h-8 min-w-8 rounded-md px-2"
          >
            →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
