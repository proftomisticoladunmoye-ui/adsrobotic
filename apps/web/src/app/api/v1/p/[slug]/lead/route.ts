import { type NextRequest, NextResponse } from 'next/server';
import { createPageLead, toErrorPayload } from '@adsrobotic/core';

export const dynamic = 'force-dynamic';

/** Public lead capture from a Smart Page form (Spec §5). No auth. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
    };
    await createPageLead(slug, {
      name: body.name?.slice(0, 200),
      email: body.email?.slice(0, 200),
      phone: body.phone?.slice(0, 60),
      message: body.message?.slice(0, 2000),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const payload = toErrorPayload(err);
    return NextResponse.json({ error: payload.message }, { status: payload.status });
  }
}
