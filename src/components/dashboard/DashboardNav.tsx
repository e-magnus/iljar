'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  {
    href: '/dashboard',
    label: 'Heim',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    href: '/appointments',
    label: 'Dagatal',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    href: '/clients',
    label: 'Skjólstæð.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Stillingar',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.02a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.02a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.02a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const showTopNav = pathname === '/dashboard';

  return (
    <>
      {showTopNav && (
        <nav className="mb-4 hidden items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 sm:flex" aria-label="Aðalvalmynd efst">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                isActive(item.href)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-gray-200 bg-white p-2 lg:hidden" aria-label="Neðri valmynd">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center rounded-lg px-2 py-2 text-[11px] ${
              isActive(item.href)
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700'
            }`}
          >
            {item.icon}
            <span className="mt-1">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
