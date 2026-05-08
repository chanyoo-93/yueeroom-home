'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function getRoleFromCookie(): string | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
    if (!match) return null;
    const parts = (match[1] ?? '').split('.');
    if (parts.length !== 3) return null;
    const base64 = (parts[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
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
