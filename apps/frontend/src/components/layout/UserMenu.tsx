'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/lib/hooks/useMe';
import { apiClient } from '@/lib/api/client';

export default function UserMenu() {
  const { data: user, isLoading } = useMe();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      queryClient.clear();
      router.push('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
        <div className="hidden h-3 w-12 animate-pulse rounded bg-gray-200 sm:block" />
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:border-gray-400 hover:text-blue-600"
      >
        로그인
      </Link>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="user-menu-dropdown"
        className="flex flex-col items-center text-xs text-gray-600 hover:text-blue-600"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        <span className="hidden sm:inline">{user.name}</span>
      </button>

      {isOpen && (
        <div
          id="user-menu-dropdown"
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg"
        >
          <Link
            href="/my-page"
            onClick={() => setIsOpen(false)}
            role="menuitem"
            className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            마이페이지
          </Link>
          <button
            onClick={() => void handleLogout()}
            role="menuitem"
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
