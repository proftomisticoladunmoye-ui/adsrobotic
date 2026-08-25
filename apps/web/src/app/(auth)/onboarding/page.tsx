import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Badge, Card, CardBody, CardHeader, CardTitle, Logo } from '@adsrobotic/ui';
import { BrainForm } from '@/components/brain-form';
import { saveBrainAction } from '@/app/actions/business';
import { getCurrentUser } from '@/lib/current-user';

export const metadata: Metadata = { title: 'Set up your Business Brain' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <Logo markOnly size="lg" className="mx-auto" />
        <Badge tone="ai" className="mt-5">
          Business Brain
        </Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ar-blue">
          Teach AdsRobotic about your business
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-ar-muted">
          The more your AI employee knows, the better it advertises. This becomes a persistent
          memory that grows more valuable over time.
        </p>
      </div>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
        </CardHeader>
        <CardBody>
          <BrainForm action={saveBrainAction} />
        </CardBody>
      </Card>
    </div>
  );
}
