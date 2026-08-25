import type { AIProvider } from './types';
import { LocalProvider } from './local-provider';

export * from './types';
export { LocalProvider } from './local-provider';

export interface AIProviderConfig {
  /** `local` (default, on-platform), `claude`, or `openrouter` (Spec §18). */
  provider?: string | undefined;
  apiKey?: string | undefined;
  model?: string | undefined;
  baseUrl?: string | undefined;
}

/**
 * Resolve the configured AI provider (Spec §18). Defaults to the on-platform
 * LocalProvider. External providers require an API key; when one is requested
 * but not configured, this falls back to local rather than failing — AI features
 * stay available and are honestly labelled as on-platform. `fellBack` tells the
 * caller so it can surface the real provider in trust labelling.
 *
 * Claude / OpenAI-compatible adapters are added in a later phase; until then a
 * request for them resolves to local.
 */
export function createAIProvider(cfg: AIProviderConfig = {}): {
  provider: AIProvider;
  fellBack: boolean;
} {
  const requested = (cfg.provider ?? 'local').toLowerCase();

  if (requested === 'claude' || requested === 'openrouter' || requested === 'openai-compatible') {
    // External adapters not yet bundled in the MVP — resolve to local and flag it.
    return { provider: new LocalProvider(), fellBack: true };
  }

  return { provider: new LocalProvider(), fellBack: false };
}
