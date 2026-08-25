import type { Config } from 'tailwindcss';
import { brandColors, typography, radii } from './tokens';

/**
 * Shared Tailwind preset. Apps extend this so brand tokens are consumed
 * consistently and never re-declared as raw hex in components (Spec §9).
 *
 * Brand namespace: `ar` — e.g. text-ar-blue, bg-ar-cyan, border-ar-border.
 */
const preset: Omit<Config, 'content'> = {
  theme: {
    extend: {
      colors: {
        ar: {
          blue: brandColors.blue,
          'blue-bright': brandColors.blueBright,
          'blue-dark': brandColors.blueDark,
          'blue-light': brandColors.blueLight,
          cyan: brandColors.cyan,
          'cyan-dark': brandColors.cyanDark,
          'cyan-light': brandColors.cyanLight,
          orange: brandColors.orange,
          'orange-dark': brandColors.orangeDark,
          'orange-light': brandColors.orangeLight,
          white: brandColors.white,
          surface: brandColors.surface,
          background: brandColors.background,
          text: brandColors.text,
          muted: brandColors.muted,
          border: brandColors.border,
          success: brandColors.success,
          warning: brandColors.warning,
          critical: brandColors.critical,
        },
      },
      fontFamily: {
        sans: typography.fontSans.split(',').map((s) => s.trim()),
        mono: typography.fontMono.split(',').map((s) => s.trim()),
      },
      borderRadius: {
        sm: radii.sm,
        DEFAULT: radii.md,
        lg: radii.lg,
        xl: radii.xl,
        '2xl': '1.25rem',
      },
      // Soft, blue-tinted elevation — premium and restrained (Spec §8).
      boxShadow: {
        xs: '0 1px 2px 0 rgba(16, 42, 67, 0.05)',
        card: '0 1px 2px rgba(16, 42, 67, 0.04), 0 6px 16px -8px rgba(16, 42, 67, 0.10)',
        'card-hover': '0 2px 4px rgba(16, 42, 67, 0.06), 0 12px 28px -10px rgba(16, 42, 67, 0.16)',
        pop: '0 8px 30px -8px rgba(16, 42, 67, 0.20)',
        'ai-glow': '0 0 0 1px rgba(0, 194, 217, 0.25), 0 6px 20px -6px rgba(0, 194, 217, 0.30)',
      },
      keyframes: {
        // Subtle "AI working" pulse for live status indicators (Spec §12).
        'ar-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        // Flow along network connection lines (Spec §10, §24 signature motif).
        'ar-flow': {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'ar-pulse': 'ar-pulse 2s ease-in-out infinite',
        'ar-flow': 'ar-flow 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default preset;
