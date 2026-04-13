'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: '홈', icon: '🏠' },
  { href: '/categories', label: '카테고리', icon: '☰' },
  { href: '/cart', label: '장바구니', icon: '🛒' },
  { href: '/mypage', label: '마이페이지', icon: '👤' },
] as const;

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden">
      <ul className="flex h-16 items-center justify-around">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <li key={href} className="flex flex-1 justify-center">
              <Link
                href={href}
                aria-label={label}
                className={`flex flex-col items-center gap-0.5 text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
              >
                <span className="text-xl">{icon}</span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
