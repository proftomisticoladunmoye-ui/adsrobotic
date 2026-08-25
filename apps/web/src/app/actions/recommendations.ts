'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { acceptRecommendation, dismissRecommendation } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

async function requireBusiness() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.activeBusiness) redirect('/onboarding');
  return { businessId: user.activeBusiness.id, userId: user.id };
}

export async function acceptRecommendationAction(formData: FormData): Promise<void> {
  const { businessId, userId } = await requireBusiness();
  await acceptRecommendation(businessId, String(formData.get('id') ?? ''), userId);
  revalidatePath('/recommendations');
  revalidatePath('/dashboard');
}

export async function dismissRecommendationAction(formData: FormData): Promise<void> {
  const { businessId, userId } = await requireBusiness();
  await dismissRecommendation(businessId, String(formData.get('id') ?? ''), userId);
  revalidatePath('/recommendations');
}
