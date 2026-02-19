import { Card, CardContent } from '@/components/ui/Card';

const steps = [
  {
    title: 'Skráðu stofuna',
    description: 'Settu upp grunnstillingar og opnunartíma á nokkrum mínútum.',
  },
  {
    title: 'Flyttu inn eða skráðu skjólstæðinga',
    description: 'Byggðu upp skjólstæðingaskrá með skipulögðum upplýsingum.',
  },
  {
    title: 'Byrjaðu að taka á móti bókunum',
    description: 'Virktu bókanir, áminningar og rekstraryfirsýn á sama degi.',
  },
];

export function StepsSection() {
  return (
    <section id="hvernig-virkar" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-900">Hvernig virkar</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="border border-gray-100 shadow-sm">
              <CardContent className="space-y-3 p-5">
                <p className="text-sm font-semibold text-blue-700">Skref {index + 1}</p>
                <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="text-sm text-gray-700">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
