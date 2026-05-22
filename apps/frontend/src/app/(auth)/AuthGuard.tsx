'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/lib/hooks/useMe';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const { data: user, isLoading, isError } = useMe();

  useEffect(() => {
    if (isLoading) return;

    if (isError) {
      router.replace('/login');
      return;
    }

    if (user?.status === 'PENDING') {
      router.replace('/pending');
      return;
    }

    if (user?.status !== 'APPROVED') {
      router.replace('/login');
      return;
    }

    setAllowed(true);
  }, [isError, isLoading, router, user?.status]);

  if (!allowed) return null;
  return <>{children}</>;
}
