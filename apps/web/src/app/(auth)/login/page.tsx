import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, Logo } from '@adsrobotic/ui';
import { LoginForm } from '@/components/auth-form';
import { loginAction } from '@/app/actions/auth';
import { getCurrentUser } from '@/lib/current-user';

export const metadata: Metadata = { title: 'Log in' };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center sm:px-6">
      <Logo markOnly size="lg" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ar-blue">Welcome back</h1>
      <p className="mt-2 text-ar-muted">Log in to your AdsRobotic workspace.</p>
      <Card className="mt-8 w-full p-6">
        <LoginForm action={loginAction} />
      </Card>
      <p className="mt-6 text-sm text-ar-muted">
        New to AdsRobotic?{' '}
        <Link href="/signup" className="font-medium text-ar-blue hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
