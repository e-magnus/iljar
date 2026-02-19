import Link from 'next/link';

const items = [
  { href: '/dashboard', label: 'Heim' },
  { href: '/appointments', label: 'Bókanir' },
  { href: '/clients', label: 'Skjólstæðingar' },
  { href: '/settings', label: 'Stillingar' },
];

export function DashboardNav() {
  return (
    <>
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white p-4 lg:block">
        <p className="mb-4 text-lg font-bold text-gray-900">iljar</p>
        <nav className="space-y-1" aria-label="Dashboard valmynd">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-gray-200 bg-white p-2 lg:hidden" aria-label="Neðri valmynd">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-lg px-2 py-2 text-center text-xs text-gray-700">
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
