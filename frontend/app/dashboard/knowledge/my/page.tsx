'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MyKnowledgeRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/knowledge?tab=my');
  }, [router]);
  return null;
}
