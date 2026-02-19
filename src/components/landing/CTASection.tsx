'use client';

import { Button } from '@/components/ui/Button';
import { trackEvent } from '@/lib/analytics';

export function CTASection() {
  const onPrimaryClick = () => {
    trackEvent('click_primary_cta', { location: 'bottom_cta' });
  };

  return (
    <section className="bg-blue-600 py-14">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-white">Einfalt, öruggt og byggt fyrir þína stofu</h2>
        <p className="mx-auto mt-3 max-w-2xl text-blue-100">
          Fáðu stutta kynningu á því hvernig iljar hjálpar þér að spara tíma og halda betri yfirsýn yfir reksturinn.
        </p>
        <div className="mt-6">
          <a href="#lead-form" onClick={onPrimaryClick}>
            <Button variant="outline" className="border-white text-white hover:bg-blue-500 hover:text-white">
              Bóka kynningu
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
