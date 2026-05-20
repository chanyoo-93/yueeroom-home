'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/lib/hooks/useMe';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const { data: user, isLoading, isError } = useMe();

  useEffect(() => {
    if (isLoading) return;

    if (isError || user?.role !== 'ADMIN') {
      router.replace('/');
      return;
    }

    setAllowed(true);
  }, [isError, isLoading, router, user?.role]);

  if (!allowed) return null;
  return <>{children}</>;
}
