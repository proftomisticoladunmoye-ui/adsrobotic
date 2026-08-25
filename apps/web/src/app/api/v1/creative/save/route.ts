import { type NextRequest, NextResponse } from 'next/server';
import { saveCreativeVariations, toErrorPayload, type CreativeVariation } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

/** Persist chosen creative variations for the active business (Spec §3, §21). */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.activeBusiness) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as {
      variations?: CreativeVariation[];
      campaignId?: string;
    };
    if (!Array.isArray(body.variations) || body.variations.length === 0) {
      return NextResponse.json({ error: 'No variations provided' }, { status: 422 });
    }
    const result = await saveCreativeVariations(
      user.activeBusiness.id,
      body.variations,
      body.campaignId,
    );
    return NextResponse.json(result);
  } catch (err) {
    const payload = toErrorPayload(err);
    return NextResponse.json({ error: payload.message }, { status: payload.status });
  }
}
