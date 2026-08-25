import { type NextRequest, NextResponse } from 'next/server';
import { generateCreativeSet, toErrorPayload, type CampaignObjective } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

/** Generate a 4-angle creative set for the active business (Spec §3). */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.activeBusiness) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as { objective?: CampaignObjective };
    const result = await generateCreativeSet(user.activeBusiness.id, {
      ...(body.objective ? { objective: body.objective } : {}),
    });
    return NextResponse.json(result);
  } catch (err) {
    const payload = toErrorPayload(err);
    return NextResponse.json({ error: payload.message }, { status: payload.status });
  }
}
