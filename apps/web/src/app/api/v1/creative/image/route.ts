import { type NextRequest, NextResponse } from 'next/server';
import { generateCreativeVisual, toErrorPayload, type CreativeAngle } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

/** Generate a visual for a creative and persist it as an asset (Spec §3). */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.activeBusiness) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as {
      prompt?: string;
      headline?: string;
      cta?: string;
      angle?: CreativeAngle;
    };
    const visual = await generateCreativeVisual(user.activeBusiness.id, {
      ...(body.prompt ? { prompt: body.prompt } : {}),
      ...(body.headline ? { headline: body.headline } : {}),
      ...(body.cta ? { cta: body.cta } : {}),
      ...(body.angle ? { angle: body.angle } : {}),
    });
    return NextResponse.json(visual);
  } catch (err) {
    const payload = toErrorPayload(err);
    return NextResponse.json({ error: payload.message }, { status: payload.status });
  }
}
