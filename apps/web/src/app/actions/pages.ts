'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createLandingPage,
  getLandingPage,
  normalizePageConfig,
  toErrorPayload,
  updateLandingPage,
  type LandingPageConfig,
} from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export interface ActionState {
  error?: string;
  ok?: boolean;
}

async function requireBusiness() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.activeBusiness) redirect('/onboarding');
  return user.activeBusiness;
}

export async function createPageAction(): Promise<void> {
  const business = await requireBusiness();
  const page = await createLandingPage(business.id, { title: 'Untitled page' });
  redirect(`/pages/${page.id}`);
}

export async function savePageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const business = await requireBusiness();
  const id = String(formData.get('id') ?? '');
  try {
    const page = await getLandingPage(business.id, id);
    const current = normalizePageConfig(page.config, business.name);

    const str = (k: string) => String(formData.get(k) ?? '').trim();
    const config: LandingPageConfig = {
      ...current,
      brand: { ...current.brand, name: str('brandName') || current.brand.name },
      hero: {
        headline: str('headline') || current.hero.headline,
        ctaLabel: str('ctaLabel') || current.hero.ctaLabel,
        ...(str('subheadline') ? { subheadline: str('subheadline') } : {}),
      },
      showLeadForm: formData.get('showLeadForm') === 'on',
    };

    const offerTitle = str('offerTitle');
    const offerBody = str('offerBody');
    if (offerTitle || offerBody) {
      config.offer = { ...(offerTitle ? { title: offerTitle } : {}), ...(offerBody ? { body: offerBody } : {}) };
    } else {
      delete config.offer;
    }

    const contact: NonNullable<LandingPageConfig['contact']> = {};
    if (str('whatsapp')) contact.whatsapp = str('whatsapp');
    if (str('phone')) contact.phone = str('phone');
    if (str('website')) contact.website = str('website');
    if (Object.keys(contact).length) config.contact = contact;
    else delete config.contact;

    await updateLandingPage(business.id, id, { title: str('title') || page.title, config });
    revalidatePath(`/pages/${id}`);
    return { ok: true };
  } catch (err) {
    return { error: toErrorPayload(err).message };
  }
}

export async function togglePublishAction(formData: FormData): Promise<void> {
  const business = await requireBusiness();
  const id = String(formData.get('id') ?? '');
  const publish = String(formData.get('publish') ?? '') === 'true';
  await updateLandingPage(business.id, id, { published: publish });
  revalidatePath(`/pages/${id}`);
  revalidatePath('/pages');
}
