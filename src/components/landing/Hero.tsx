'use client';

import { Button } from '@/components/ui/Button';
import { trackEvent } from '@/lib/analytics';

export function Hero() {
  const onPrimaryClick = () => {
    trackEvent('click_primary_cta', { location: 'hero' });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 lg:px-8 lg:pt-16">
      <div className="max-w-3xl">
        <p className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          Byggt fyrir íslenskar fótaaðgerðarstofur
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Einfaldaðu rekstur stofunnar á einum stað
        </h1>
        <p className="mt-4 text-lg text-gray-700">
          iljar sparar tíma í tímabókunum, minnkar pappírsvinnu og dregur úr no-shows með skýrum verkferlum fyrir daglegan rekstur.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="#lead-form" onClick={onPrimaryClick}>
            <Button className="w-full sm:w-auto" size="lg">Bóka kynningu</Button>
          </a>
          <a href="#hvernig-virkar">
            <Button className="w-full sm:w-auto" variant="outline" size="lg">Sjá hvernig það virkar</Button>
          </a>
        </div>
      </div>
    </section>
  );
}
