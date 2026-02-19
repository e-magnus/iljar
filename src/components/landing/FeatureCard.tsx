import { Card, CardContent } from '@/components/ui/Card';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <Card className="h-full border border-gray-100 shadow-sm">
      <CardContent className="space-y-3 p-5">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-700">{description}</p>
      </CardContent>
    </Card>
  );
}
