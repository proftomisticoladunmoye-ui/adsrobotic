/**
 * AdsRobotic product constants — shared, non-secret vocabulary used across the
 * UI, AI orchestration layer, and database seed. Keeping these here prevents
 * strings drifting between the marketing site, the app, and the schema.
 */

export const BRAND = {
  name: 'AdsRobotic',
  tagline: 'Your Autonomous AI Advertising Employee',
  campaignTagline: 'Describe Your Business. Set Your Budget. Let AdsRobotic Find Your Customers.',
  category: 'Autonomous AI Advertising Employee',
  primaryCta: 'Hire AdsRobotic',
  promise: 'Your Business. Your Budget. Your AI Advertising Employee.',
} as const;

/** Business Brain intelligence maturity ladder (Spec §1, Engine 1). */
export const BUSINESS_BRAIN_STAGES = [
  { key: 'new', label: 'New Business', order: 0 },
  { key: 'profile_established', label: 'Business Profile Established', order: 1 },
  { key: 'patterns_detected', label: 'Customer Patterns Detected', order: 2 },
  { key: 'campaign_intelligence', label: 'Campaign Intelligence Developed', order: 3 },
  { key: 'predictive', label: 'Predictive Growth Intelligence', order: 4 },
] as const;

export type BusinessBrainStageKey = (typeof BUSINESS_BRAIN_STAGES)[number]['key'];

/** The four AI autonomy levels (Spec §6). */
export const AUTONOMY_LEVELS = [
  {
    level: 1,
    key: 'advisor',
    label: 'Advisor',
    summary: 'Analyses, recommends, and explains. You take every action.',
  },
  {
    level: 2,
    key: 'assistant',
    label: 'Assistant',
    summary: 'Creates campaigns, creatives, and strategies. You approve before publishing.',
  },
  {
    level: 3,
    key: 'manager',
    label: 'Manager',
    summary:
      'Launches approved campaigns, runs experiments, pauses poor performers, and reallocates budget within your limits.',
  },
  {
    level: 4,
    key: 'autonomous',
    label: 'Autonomous Employee',
    summary: 'Operates continuously within the explicit authority and guardrails you define.',
  },
] as const;

export type AutonomyLevelKey = (typeof AUTONOMY_LEVELS)[number]['key'];

/** Campaign objectives the Strategist can plan for (Spec §2, §13 Screen 1). */
export const CAMPAIGN_OBJECTIVES = [
  { key: 'get_customers', label: 'Get Customers' },
  { key: 'get_leads', label: 'Get Leads' },
  { key: 'increase_sales', label: 'Increase Sales' },
  { key: 'website_traffic', label: 'Website Traffic' },
  { key: 'whatsapp_messages', label: 'WhatsApp Messages' },
  { key: 'promote_event', label: 'Promote an Event' },
  { key: 'promote_app', label: 'Promote My App' },
  { key: 'build_awareness', label: 'Build Awareness' },
  { key: 'recruit_participants', label: 'Recruit Participants' },
] as const;

export type CampaignObjectiveKey = (typeof CAMPAIGN_OBJECTIVES)[number]['key'];

/** Where a campaign sends its traffic (Spec §5). */
export const CONVERSION_DESTINATIONS = [
  { key: 'website', label: 'Website' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'phone', label: 'Phone Call' },
  { key: 'smart_page', label: 'AdsRobotic Smart Page' },
] as const;

export type ConversionDestinationKey = (typeof CONVERSION_DESTINATIONS)[number]['key'];

/** The customer-journey funnel the outcome engine models (Spec §1, Engine 5). */
export const OUTCOME_FUNNEL = [
  'impression',
  'click',
  'landing_page',
  'lead',
  'contact',
  'qualified_lead',
  'customer',
  'purchase',
  'repeat_purchase',
] as const;

/** AI confidence vocabulary — never imply certainty the AI lacks (Spec §22). */
export const AI_CONFIDENCE = ['high', 'moderate', 'early_signal', 'more_data_needed'] as const;
export type AIConfidence = (typeof AI_CONFIDENCE)[number];
