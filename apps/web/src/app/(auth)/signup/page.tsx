import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, Logo } from '@adsrobotic/ui';
import { SignupForm } from '@/components/auth-form';
import { registerAction } from '@/app/actions/auth';
import { getCurrentUser } from '@/lib/current-user';

export const metadata: Metadata = { title: 'Hire AdsRobotic' };
export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center sm:px-6">
      <Logo markOnly size="lg" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ar-blue">Hire AdsRobotic</h1>
      <p className="mt-2 text-ar-muted">
        Create your account and put your AI advertising employee to work.
      </p>
      <Card className="mt-8 w-full p-6">
        <SignupForm action={registerAction} />
      </Card>
      <p className="mt-6 text-sm text-ar-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-ar-blue hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
