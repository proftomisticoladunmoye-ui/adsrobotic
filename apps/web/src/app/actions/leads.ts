'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { convertLead, setLeadStatus, type LeadStatus } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

async function requireBusiness() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.activeBusiness) redirect('/onboarding');
  return user.activeBusiness;
}

export async function setLeadStatusAction(formData: FormData): Promise<void> {
  const business = await requireBusiness();
  const leadId = String(formData.get('leadId') ?? '');
  const status = String(formData.get('status') ?? '') as LeadStatus;
  await setLeadStatus(business.id, leadId, status);
  revalidatePath('/leads');
}

export async function convertLeadAction(formData: FormData): Promise<void> {
  const business = await requireBusiness();
  const leadId = String(formData.get('leadId') ?? '');
  const raw = String(formData.get('value') ?? '').trim();
  const value = raw ? Number(raw) : undefined;
  await convertLead(business.id, leadId, value !== undefined && !Number.isNaN(value) ? value : undefined);
  revalidatePath('/leads');
  revalidatePath('/dashboard');
}
