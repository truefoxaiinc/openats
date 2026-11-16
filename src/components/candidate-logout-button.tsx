'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function CandidateLogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch('/api/candidate-auth/logout', { method: 'POST' });
    router.replace('/candidate/login');
    router.refresh();
  }
  return <Button variant="ghost" onClick={logout}>Sign out</Button>;
}
