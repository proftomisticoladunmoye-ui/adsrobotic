import type { Metadata } from 'next';
import { AssistantChat } from '@/components/assistant-chat';

export const metadata: Metadata = { title: 'AI Assistant' };
export const dynamic = 'force-dynamic';

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ar-blue">AI Assistant</h1>
        <p className="mt-1 text-ar-muted">Your always-on advertising employee.</p>
      </div>
      <AssistantChat />
    </div>
  );
}
