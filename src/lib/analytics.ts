export type LandingEvent =
  | 'view_landing'
  | 'click_primary_cta'
  | 'click_login'
  | 'submit_lead_form'
  | 'scroll_75_percent'
  | 'view_dashboard'
  | 'click_new_booking'
  | 'mark_arrived'
  | 'mark_completed'
  | 'open_reschedule'
  | 'complete_setup_step';

export function trackEvent(event: LandingEvent, metadata?: Record<string, string>) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    event,
    metadata,
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics', blob);
    return;
  }

  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
  });
}
