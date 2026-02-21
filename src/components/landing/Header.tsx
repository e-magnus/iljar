'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { trackEvent } from '@/lib/analytics';

export function Header() {
  const onLoginClick = () => {
    trackEvent('click_login', { location: 'header' });
  };

  const onPrimaryClick = () => {
    trackEvent('click_primary_cta', { location: 'header' });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold text-gray-900" aria-label="iljar forsíða">
          iljar
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Aðalvalmynd">
          <a href="#virkni" className="text-sm text-gray-700 hover:text-gray-900">Virkni</a>
          <a href="#hvernig-virkar" className="text-sm text-gray-700 hover:text-gray-900">Hvernig virkar</a>
          <a href="#verd" className="text-sm text-gray-700 hover:text-gray-900">Verð</a>
          <Link href="/login" onClick={onLoginClick} className="text-sm text-gray-700 hover:text-gray-900">
            Innskráning
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" onClick={onLoginClick} className="inline-flex">
            <Button variant="outline" size="sm">Innskráning</Button>
          </Link>
          <a href="#lead-form" onClick={onPrimaryClick}>
            <Button size="sm">Bóka kynningu</Button>
          </a>
        </div>
      </div>
    </header>
  );
}
