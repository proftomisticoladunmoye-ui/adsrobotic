import { loadServerEnv } from '@adsrobotic/config';
import { createAIProvider, type ChatMessage } from '@adsrobotic/ai';
import { prisma } from '@adsrobotic/db';
import { assembleBusinessFacts } from './business-brain';

export interface AssistantReply {
  text: string;
  confidence: string;
  model: string;
  external: boolean;
  fellBack: boolean;
}

/**
 * The AdsRobotic command interface (Spec §7). Answers using the business memory
 * (grounded facts) plus recent live campaign/activity context, through the
 * configured AI provider. The default on-platform provider makes no external
 * calls; an external provider is used only when configured.
 */
export async function askAssistant(
  businessId: string,
  messages: ChatMessage[],
): Promise<AssistantReply> {
  const env = loadServerEnv();
  const { provider, fellBack } = createAIProvider({
    provider: env.AI_PROVIDER,
    apiKey: env.AI_API_KEY,
    model: env.AI_MODEL,
    baseUrl: env.AI_BASE_URL,
  });

  const [facts, activities, campaigns] = await Promise.all([
    assembleBusinessFacts(businessId),
    prisma.aIActivity.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.campaign.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const liveFacts = [
    ...activities.map((a) => ({ ref: `activity:${a.id}`, kind: 'metric', text: a.summary })),
    ...campaigns.map((c) => ({
      ref: `campaign:${c.id}`,
      kind: 'output',
      text: `Campaign "${c.name}" is ${c.status} (objective: ${c.objective.replace(/_/g, ' ')}).`,
    })),
  ];

  const last = messages[messages.length - 1]?.content ?? '';
  const result = await provider.generate({
    agent: 'recommendation',
    task: 'assistant:chat',
    instruction: last,
    facts: [...facts, ...liveFacts],
    messages,
  });

  return {
    text: result.text,
    confidence: result.confidence,
    model: result.model,
    external: result.external,
    fellBack,
  };
}
