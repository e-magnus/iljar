import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SetupChecklistState } from '@/components/dashboard/types';
import { trackEvent } from '@/lib/analytics';

interface SetupChecklistProps {
  checklist: SetupChecklistState;
}

export function SetupChecklist({ checklist }: SetupChecklistProps) {
  if (checklist.completed >= checklist.total) {
    return null;
  }

  const steps = [
    {
      key: 'services',
      label: 'Setja upp þjónustur',
      done: checklist.services,
      href: '/settings#services',
    },
    {
      key: 'openingHours',
      label: 'Setja opnunartíma',
      done: checklist.openingHours,
      href: '/availability',
    },
    {
      key: 'reminders',
      label: 'Tengja áminningar',
      done: checklist.reminders,
      href: '/settings#reminders',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uppsetning</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-700">{checklist.completed}/{checklist.total} skref kláruð</p>
        <ul className="space-y-2">
          {steps.map((step) => (
            <li key={step.key} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <p className="text-sm text-gray-800">{step.label}</p>
              {step.done ? (
                <span className="text-xs font-semibold text-green-700">Klárað</span>
              ) : (
                <a
                  href={step.href}
                  onClick={() => trackEvent('complete_setup_step', { step: step.key })}
                >
                  <Button size="sm">Klára</Button>
                </a>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
