'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

export function LandingTracker() {
  useEffect(() => {
    trackEvent('view_landing');

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const scrollable = doc.scrollHeight - doc.clientHeight;

      if (scrollable <= 0) {
        return;
      }

      const progress = (scrollTop / scrollable) * 100;
      if (progress >= 75 && !sessionStorage.getItem('tracked_scroll_75')) {
        sessionStorage.setItem('tracked_scroll_75', '1');
        trackEvent('scroll_75_percent');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return null;
}
