import type { Metadata } from 'next';
import { PageHeader } from '@adsrobotic/ui';
import { AssistantChat } from '@/components/assistant-chat';

export const metadata: Metadata = { title: 'AI Assistant' };
export const dynamic = 'force-dynamic';

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Command interface"
        title="AI Assistant"
        description="Your always-on advertising employee — ask anything about your business or campaigns."
      />
      <AssistantChat />
    </div>
  );
}
