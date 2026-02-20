'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredToken } from './lib/session';

export default function HomePage(): null {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken().trim();
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);

  return null;
}
