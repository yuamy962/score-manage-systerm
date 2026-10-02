'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KnowledgeReviewRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/knowledge?tab=review');
  }, [router]);
  return null;
}
