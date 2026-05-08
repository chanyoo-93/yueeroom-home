'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/users', label: '회원 관리' },
  { href: '/admin/categories', label: '카테고리 관리' },
  { href: '/admin/products', label: '상품 관리' },
  { href: '/admin/orders', label: '주문 관리' },
  { href: '/admin/inventory', label: '재고 관리' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
      <div className="px-4 py-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">관리자</p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive =
              pathname === href || (href !== '/admin' && pathname.startsWith(href + '/'));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
