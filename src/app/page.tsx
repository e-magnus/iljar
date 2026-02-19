import type { Metadata } from 'next';
import Script from 'next/script';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { FeatureCard } from '@/components/landing/FeatureCard';
import { StepsSection } from '@/components/landing/StepsSection';
import { CTASection } from '@/components/landing/CTASection';
import { LeadForm } from '@/components/landing/LeadForm';
import { Footer } from '@/components/landing/Footer';
import { LandingTracker } from '@/components/landing/LandingTracker';

export const metadata: Metadata = {
  title: 'iljar | Rekstrarkerfi fyrir fótaaðgerðarstofur',
  description: 'Stafrænt rekstrarkerfi fyrir fótaaðgerðafræðinga: tímabókanir, skjólstæðingaskrá og yfirlit á einum stað.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <LandingTracker />
      <Header />
      <Hero />

      <section id="virkni" className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">Virkni sem skilar daglegum ávinningi</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Tímabókanir og áminningar"
              description="Styttri tími í bókunum og færri no-shows með skýru bókunarflæði."
              icon={<span aria-hidden>🗓️</span>}
            />
            <FeatureCard
              title="Skjólstæðingaskrá"
              description="Allar helstu skjólstæðingaupplýsingar á einum stað fyrir hraðari þjónustu."
              icon={<span aria-hidden>👥</span>}
            />
            <FeatureCard
              title="Tekju- og greiðsluyfirlit"
              description="Fáðu betri yfirsýn yfir rekstur stofunnar og tekjuflæði."
              icon={<span aria-hidden>💳</span>}
            />
            <FeatureCard
              title="Skýrslur og yfirlit"
              description="Taktu betri rekstrarákvarðanir með einföldum samantektum."
              icon={<span aria-hidden>📊</span>}
            />
            <FeatureCard
              title="GDPR samræmi"
              description="Öryggismiðuð gagnavinnsla og rekjanleiki sem styður persónuvernd."
              icon={<span aria-hidden>🔒</span>}
            />
          </div>
        </div>
      </section>

      <StepsSection />

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">Traustþættir</h2>
          <ul className="mt-6 space-y-3 text-gray-700">
            <li>Byggt fyrir íslenskar fótaaðgerðarstofur</li>
            <li>Áhersla á öryggi og gagnavernd</li>
            <li>Umsagnir koma í næstu útgáfu (MVP placeholder)</li>
          </ul>
        </div>
      </section>

      <section id="verd" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">Verð</h2>
          <p className="mt-4 text-gray-700">Verðupplýsingar eru í undirbúningi. Hafðu samband til að bóka kynningu.</p>
        </div>
      </section>

      <CTASection />
      <LeadForm />
      <Footer />

      <Script type="application/ld+json" src="/schema/organization.json" strategy="afterInteractive" />
      <Script
        type="application/ld+json"
        src="/schema/software-application.json"
        strategy="afterInteractive"
      />
    </div>
  );
}
