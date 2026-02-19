import Link from 'next/link';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-gray-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>Tengiliður: hallo@iljar.is · +354 555 0000</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-gray-900">Persónuverndarstefna</Link>
          <Link href="/terms" className="hover:text-gray-900">Skilmálar</Link>
        </div>
        <p>© {year} iljar</p>
      </div>
    </footer>
  );
}
