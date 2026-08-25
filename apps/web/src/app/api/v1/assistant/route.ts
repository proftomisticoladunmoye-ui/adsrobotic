import { type NextRequest, NextResponse } from 'next/server';
import { askAssistant, toErrorPayload, type ChatMessage } from '@adsrobotic/core';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

/**
 * The AdsRobotic command interface endpoint (Spec §7). Accepts the chat history
 * and returns a grounded reply scoped to the caller's active business.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.activeBusiness) {
      return NextResponse.json({ error: 'No active business' }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as { messages?: ChatMessage[] };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    if (messages.length === 0) {
      return NextResponse.json({ error: 'A message is required' }, { status: 422 });
    }

    const reply = await askAssistant(user.activeBusiness.id, messages);
    return NextResponse.json(reply);
  } catch (err) {
    const payload = toErrorPayload(err);
    return NextResponse.json({ error: payload.message }, { status: payload.status });
  }
}
