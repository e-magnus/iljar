import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { trackEvent } from '@/lib/analytics';

export function QuickActions() {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Flýtiaðgerðir</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link
          href="/booking"
          onClick={() => trackEvent('click_new_booking')}
        >
          <Button className="h-11 w-full">Ný bókun</Button>
        </Link>
        <Link href="/clients">
          <Button className="h-11 w-full" variant="outline">Nýr skjólstæðingur</Button>
        </Link>
        <Link href="/settings#reminders">
          <Button className="h-11 w-full" variant="outline">Stilla áminningar</Button>
        </Link>
        <Link href="/appointments">
          <Button className="h-11 w-full" variant="outline">Skoða dagatal</Button>
        </Link>
      </div>
    </div>
  );
}
