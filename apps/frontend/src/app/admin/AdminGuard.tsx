'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { decodeJwtPayload } from '@/lib/utils/jwt';

function getRoleFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
  if (!match) return null;
  const payload = decodeJwtPayload(match[1] ?? '');
  return (payload?.role as string | undefined) ?? null;
}

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const role = getRoleFromCookie();
    if (role === 'ADMIN') {
      setAllowed(true);
    } else {
      router.replace('/');
    }
  }, [router]);

  if (!allowed) return null;
  return <>{children}</>;
}
