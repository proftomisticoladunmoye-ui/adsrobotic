import { redirect } from 'next/navigation';
import { listAccessibleBusinesses } from '@adsrobotic/core';
import { AppShell } from '@/components/app-shell';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.activeBusiness) redirect('/onboarding');
  const businesses = await listAccessibleBusinesses(user.id);
  return (
    <AppShell user={user} businesses={businesses}>
      {children}
    </AppShell>
  );
}
