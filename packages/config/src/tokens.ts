/**
 * AdsRobotic brand design tokens — single source of truth (Spec §9, §10).
 *
 * RULES (Spec §9):
 * - The interface is predominantly WHITE + ROBOTIC DEEP BLUE.
 * - CYAN represents AI activity (live status, automation, data intelligence) —
 *   used sparingly.
 * - ORANGE (Signal Orange) represents action & growth — reserved for important
 *   CTAs, growth opportunities, and attention-demanding business actions.
 *   Never overuse orange.
 * - Maintain WCAG 2.2 AA contrast.
 *
 * Do not scatter raw hex values through components — consume these tokens
 * (via the Tailwind preset / CSS variables) instead.
 */

export const brandColors = {
  // Primary — Robotic Deep Blue (dominant brand identity, nav, headers, trust)
  blue: '#0A2463',
  // Secondary — Intelligence Blue (interactive elements, links, AI actions)
  blueBright: '#146CFF',
  // Deep shade for hovers / pressed states on primary blue
  blueDark: '#071A49',
  // Light blue wash for selected / hovered surfaces
  blueLight: '#EAF1FF',

  // Accent — Electric Cyan (AI activity, live status, automation indicators)
  cyan: '#00C2D9',
  cyanDark: '#0092A6',
  cyanLight: '#E3FAFD',

  // Action / Growth — Signal Orange (important CTAs, growth opportunities)
  orange: '#FF7A00',
  orangeDark: '#CC6200',
  orangeLight: '#FFF1E3',

  // Surfaces
  white: '#FFFFFF',
  surface: '#FFFFFF',
  background: '#F7F9FC',

  // Text
  text: '#102A43', // Primary text
  muted: '#627D98', // Secondary text
  border: '#D9E2EC', // Hairline borders / dividers

  // Semantic
  success: '#16A34A',
  warning: '#F59E0B',
  critical: '#DC2626',
} as const;

export type BrandColorToken = keyof typeof brandColors;

/**
 * CSS custom properties (the `--ar-*` contract).
 * Injected into :root by the web app's global stylesheet and mirrored in
 * packages/ui/src/styles.css for plain-CSS consumers.
 */
export const cssVariables: Record<string, string> = {
  '--ar-blue': brandColors.blue,
  '--ar-blue-bright': brandColors.blueBright,
  '--ar-blue-dark': brandColors.blueDark,
  '--ar-blue-light': brandColors.blueLight,
  '--ar-cyan': brandColors.cyan,
  '--ar-cyan-dark': brandColors.cyanDark,
  '--ar-cyan-light': brandColors.cyanLight,
  '--ar-orange': brandColors.orange,
  '--ar-orange-dark': brandColors.orangeDark,
  '--ar-orange-light': brandColors.orangeLight,
  '--ar-white': brandColors.white,
  '--ar-surface': brandColors.surface,
  '--ar-background': brandColors.background,
  '--ar-text': brandColors.text,
  '--ar-muted': brandColors.muted,
  '--ar-border': brandColors.border,
  '--ar-success': brandColors.success,
  '--ar-warning': brandColors.warning,
  '--ar-critical': brandColors.critical,
};

export function cssVariablesBlock(): string {
  const body = Object.entries(cssVariables)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `:root {\n${body}\n}`;
}

/** Typography (Spec §8): Inter with a robust system fallback. */
export const typography = {
  fontSans:
    'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontMono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
} as const;

export const radii = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
} as const;
