/**
 * AI orchestration layer for AdsRobotic (Spec §18).
 *
 * The platform's intelligence is organised as named *agents*, each with a
 * responsibility drawn from the five engines. Every agent runs through a single
 * provider abstraction so AI vendors are never tightly coupled (Spec §18): the
 * default `local` provider is deterministic and makes no external calls; Claude
 * and OpenAI-compatible gateways are config-gated drop-ins added later.
 *
 * Grounding & honesty rules (Spec §22, §28):
 * - Never fabricate campaign results; distinguish estimated from actual.
 * - Never claim certainty the data does not support — carry an explicit
 *   confidence with every recommendation.
 * - Every autonomous action must be explainable (the "why").
 */

export type AIAgentKind =
  | 'business_brain' // learns & maintains the business profile
  | 'strategist' // turns goals into executable strategies
  | 'creative' // generates copy / visual / video concepts
  | 'budget_guardian' // protects spend against guardrails
  | 'performance_analyst' // reads metrics, finds patterns
  | 'recommendation' // proposes next actions
  | 'reporting'; // composes shareable outcome reports

export type AIConfidence = 'high' | 'moderate' | 'early_signal' | 'more_data_needed';

/** A single verified fact the provider is permitted to use. */
export interface GroundedFact {
  ref: string;
  kind: string;
  text: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Everything a provider may see for one generation. */
export interface AIRequest {
  agent: AIAgentKind;
  /** Machine task key, e.g. `strategy:get_leads`. */
  task: string;
  instruction: string;
  /** The only facts the provider may rely on (no fabrication beyond these). */
  facts?: GroundedFact[];
  /** Author-supplied material to refine (creative assist). */
  material?: string;
  /** Multi-turn chat history for the command interface (Spec §7). */
  messages?: ChatMessage[];
  maxTokens?: number;
}

export interface AIResult {
  text: string;
  /** `local` or e.g. `claude:claude-opus-5`. */
  model: string;
  /** Confidence the agent attaches to the output (Spec §22). */
  confidence: AIConfidence;
  /** Refs of the facts the output is grounded in. */
  sources: string[];
  /** True when produced by an external service. */
  external: boolean;
}

/** A pluggable generation backend (Spec §18). */
export interface AIProvider {
  readonly name: string;
  readonly external: boolean;
  generate(req: AIRequest): Promise<AIResult>;
}
