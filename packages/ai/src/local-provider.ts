import type { AIProvider, AIRequest, AIResult } from './types';

/**
 * LocalProvider — the default on-platform provider (Spec §18). Deterministic,
 * makes no external calls, and never fabricates data: it only restates and
 * arranges the facts it is handed. Good enough to power demo mode and to keep
 * every AI feature available with no API key configured.
 *
 * External providers (Claude / OpenAI-compatible) implement the same interface
 * and are swapped in via createAIProvider once a key is present.
 */
export class LocalProvider implements AIProvider {
  readonly name = 'local';
  readonly external = false;

  async generate(req: AIRequest): Promise<AIResult> {
    const sources = (req.facts ?? []).map((f) => f.ref);
    const factLines = (req.facts ?? []).map((f) => `• ${f.text}`).join('\n');

    // Confidence follows evidence: more grounded facts ⇒ more confidence, but we
    // never claim "high" from thin data (Spec §22).
    const n = sources.length;
    const confidence = n >= 4 ? 'moderate' : n >= 1 ? 'early_signal' : 'more_data_needed';

    const header =
      req.messages && req.messages.length
        ? req.messages[req.messages.length - 1]?.content ?? req.instruction
        : req.instruction;

    const body = [
      header,
      factLines ? `\nBased on your records:\n${factLines}` : '',
      req.material ? `\nWorking from your material:\n${req.material.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      text: body.trim(),
      model: 'local',
      confidence,
      sources,
      external: false,
    };
  }
}
