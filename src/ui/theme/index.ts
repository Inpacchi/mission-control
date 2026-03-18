import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Background scale
        'bg.canvas': { value: '#0D1117' },
        'bg.base': { value: '#13181F' },
        'bg.surface': { value: '#1C2333' },
        'bg.elevated': { value: '#232D3F' },
        'bg.overlay': { value: '#2A3750' },
        'bg.input': { value: '#1A2236' },

        // Text scale
        'text.primary': { value: '#E8EDF4' },
        'text.secondary': { value: '#8B99B3' },
        'text.muted': { value: '#4E5C72' },
        'text.inverse': { value: '#0D1117' },
        'text.accent': { value: '#7EB8F7' },

        // Accent — Mission Blue
        'accent.blue.900': { value: '#0A1628' },
        'accent.blue.700': { value: '#1A4080' },
        'accent.blue.500': { value: '#2F74D0' },
        'accent.blue.400': { value: '#4D8FE8' },
        'accent.blue.300': { value: '#7EB8F7' },
        'accent.blue.200': { value: '#A8D0FB' },

        // Accent — Pulse Violet
        'accent.violet.700': { value: '#2D1B69' },
        'accent.violet.500': { value: '#6B46C1' },
        'accent.violet.400': { value: '#8B5CF6' },
        'accent.violet.300': { value: '#A78BFA' },
        'accent.violet.200': { value: '#C4B5FD' },

        // Accent — Solar Amber
        'accent.amber.700': { value: '#78350F' },
        'accent.amber.500': { value: '#D97706' },
        'accent.amber.400': { value: '#F59E0B' },
        'accent.amber.300': { value: '#FCD34D' },
        'accent.amber.200': { value: '#FDE68A' },

        // Semantic
        'semantic.success': { value: '#22C55E' },
        'semantic.success.bg': { value: '#052E16' },
        'semantic.success.border': { value: '#16A34A' },
        'semantic.warning': { value: '#F59E0B' },
        'semantic.warning.bg': { value: '#422006' },
        'semantic.warning.border': { value: '#D97706' },
        'semantic.error': { value: '#F87171' },
        'semantic.error.bg': { value: '#2D0A0A' },
        'semantic.error.border': { value: '#EF4444' },
        'semantic.info': { value: '#7EB8F7' },
        'semantic.info.bg': { value: '#0A1628' },
        'semantic.info.border': { value: '#2F74D0' },

        // Column colors
        'column.idea': { value: '#A78BFA' },
        'column.spec': { value: '#60A5FA' },
        'column.plan': { value: '#34D399' },
        'column.inprogress': { value: '#F59E0B' },
        'column.review': { value: '#FB923C' },
        'column.complete': { value: '#22C55E' },
        'column.blocked': { value: '#F87171' },

        // Column derived — bg (10% opacity approximations)
        'column.idea.bg': { value: '#1E1A2E' },
        'column.spec.bg': { value: '#0A1628' },
        'column.plan.bg': { value: '#0A2B1E' },
        'column.inprogress.bg': { value: '#2D1A04' },
        'column.review.bg': { value: '#2D1602' },
        'column.complete.bg': { value: '#052E16' },
        'column.blocked.bg': { value: '#2D0A0A' },

        // Column derived — border (60% opacity)
        'column.idea.border': { value: '#A78BFA99' },
        'column.spec.border': { value: '#60A5FA99' },
        'column.plan.border': { value: '#34D39999' },
        'column.inprogress.border': { value: '#F59E0B99' },
        'column.review.border': { value: '#FB923C99' },
        'column.complete.border': { value: '#22C55E99' },
        'column.blocked.border': { value: '#F8717199' },

        // Status badge colors
        'badge.idea.bg': { value: '#1E1A2E' },
        'badge.idea.text': { value: '#A78BFA' },
        'badge.idea.border': { value: '#A78BFA40' },
        'badge.spec.bg': { value: '#0A1628' },
        'badge.spec.text': { value: '#60A5FA' },
        'badge.spec.border': { value: '#60A5FA40' },
        'badge.plan.bg': { value: '#0A2B1E' },
        'badge.plan.text': { value: '#34D399' },
        'badge.plan.border': { value: '#34D39940' },
        'badge.inprogress.bg': { value: '#2D1A04' },
        'badge.inprogress.text': { value: '#F59E0B' },
        'badge.inprogress.border': { value: '#F59E0B40' },
        'badge.review.bg': { value: '#2D1602' },
        'badge.review.text': { value: '#FB923C' },
        'badge.review.border': { value: '#FB923C40' },
        'badge.complete.bg': { value: '#052E16' },
        'badge.complete.text': { value: '#22C55E' },
        'badge.complete.border': { value: '#22C55E40' },
        'badge.blocked.bg': { value: '#2D0A0A' },
        'badge.blocked.text': { value: '#F87171' },
        'badge.blocked.border': { value: '#F8717140' },

        // Borders
        'border.subtle': { value: '#1E2A3B' },
        'border.default': { value: '#2A3750' },
        'border.strong': { value: '#3D5070' },
        'border.accent': { value: '#2F74D0' },

        // Card type colors — namespace cardType.* avoids TypeScript keyword collision with 'type'
        'cardType.feature': { value: '#F59E0B' },
        'cardType.bugfix': { value: '#A78BFA' },
        'cardType.refactor': { value: '#E879A8' },
        'cardType.research': { value: '#34D399' },
        'cardType.architecture': { value: '#60A5FA' },

        // Rarity treatment gradients
        // shimmer uses var(--card-accent) set at component level; all others use concrete hex
        'rarity.foil.gradient': { value: 'linear-gradient(135deg, #2A3750 0%, #3D5070 50%, #2A3750 100%)' },
        'rarity.shimmer.gradient': { value: 'linear-gradient(90deg, transparent 0%, var(--card-accent) 50%, transparent 100%)' },
        'rarity.gold.gradient': { value: 'linear-gradient(135deg, #B8860B 0%, #FFD700 25%, #DAA520 50%, #FFD700 75%, #B8860B 100%)' },
        'rarity.holo.gradient': { value: 'linear-gradient(135deg, #ff000040 0%, #00ff0040 25%, #0000ff40 50%, #ff00ff40 75%, #00ffff40 100%)' },
      },
      fonts: {
        heading: { value: "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif" },
        body: { value: "'Inter', system-ui, -apple-system, sans-serif" },
        mono: { value: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace" },
      },
      fontSizes: {
        xs: { value: '0.6875rem' },   // 11px
        sm: { value: '0.75rem' },     // 12px
        base: { value: '0.875rem' },  // 14px
        md: { value: '0.9375rem' },   // 15px
        lg: { value: '1.0625rem' },   // 17px
        xl: { value: '1.25rem' },     // 20px
        '2xl': { value: '1.5rem' },   // 24px
        '3xl': { value: '1.875rem' }, // 30px
      },
      spacing: {
        '1': { value: '4px' },
        '2': { value: '8px' },
        '3': { value: '12px' },
        '4': { value: '16px' },
        '5': { value: '20px' },
        '6': { value: '24px' },
        '8': { value: '32px' },
        '10': { value: '40px' },
      },
      radii: {
        sm: { value: '4px' },
        md: { value: '8px' },
        lg: { value: '12px' },
        xl: { value: '16px' },
        full: { value: '9999px' },
      },
      shadows: {
        none: { value: 'none' },
        xs: { value: '0 1px 2px rgba(0,0,0,0.4)' },
        sm: { value: '0 2px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)' },
        md: { value: '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.5)' },
        lg: { value: '0 8px 24px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.4)' },
        inset: { value: 'inset 0 1px 3px rgba(0,0,0,0.4)' },
        'glow.blue': { value: '0 0 0 3px rgba(47,116,208,0.35)' },
        'glow.violet': { value: '0 0 0 3px rgba(107,70,193,0.35)' },
        selected: { value: '0 0 0 4px rgba(47,116,208,0.5)' },
        panel: { value: '-8px 0 40px rgba(0,0,0,0.6), -2px 0 8px rgba(0,0,0,0.4)' },

        // Card-specific shadows — deeper blacks tuned for dark card surfaces
        'card.sm': { value: '0 2px 4px rgba(6,15,28,0.6), 0 1px 2px rgba(6,15,28,0.7)' },
        'card.md': { value: '0 4px 12px rgba(6,15,28,0.6), 0 2px 4px rgba(6,15,28,0.7)' },
        'card.lg': { value: '0 8px 24px rgba(6,15,28,0.7), 0 4px 8px rgba(6,15,28,0.5)' },
        'card.glow.green': { value: '0 0 12px rgba(34,197,94,0.4), 0 0 4px rgba(34,197,94,0.2)' },
      },
    },
  },
  globalCss: {
    '*': {
      margin: 0,
      padding: 0,
      boxSizing: 'border-box',
    },
    'html, body, #root': {
      height: '100%',
      width: '100%',
      overflow: 'hidden',
    },
    body: {
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      backgroundColor: '#0D1117',
      color: '#E8EDF4',
    },
    ':focus-visible': {
      outline: 'none',
      boxShadow: '0 0 0 3px rgba(47,116,208,0.5)',
    },
    '.terminal-context :focus-visible': {
      boxShadow: '0 0 0 3px rgba(107,70,193,0.5)',
    },
    '@media (prefers-reduced-motion: reduce)': {
      ['*, ::before, ::after' as any]: {
        animationDuration: '0.01ms !important',
        animationIterationCount: '1 !important',
        transitionDuration: '0.01ms !important',
        scrollBehavior: 'auto !important',
      },
    },
    // Custom scrollbar for kanban columns
    '.kanban-column-body::-webkit-scrollbar': {
      width: '4px',
    },
    '.kanban-column-body::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '.kanban-column-body::-webkit-scrollbar-thumb': {
      background: '#2A3750',
      borderRadius: '2px',
    },
    '.kanban-column-body::-webkit-scrollbar-thumb:hover': {
      background: '#3D5070',
    },

    // Custom scrollbar for zone strip containers
    '.zone-strip-body::-webkit-scrollbar': {
      width: '4px',
    },
    '.zone-strip-body::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '.zone-strip-body::-webkit-scrollbar-thumb': {
      background: '#2A3750',
      borderRadius: '2px',
    },
    '.zone-strip-body::-webkit-scrollbar-thumb:hover': {
      background: '#3D5070',
    },

    // Card animation keyframes — transform and opacity only for GPU compositing
    // foilShift: subtle background-position shimmer for foil cards
    ['@keyframes foilShift' as any]: {
      '0%':   { transform: 'translateX(0%)' },
      '50%':  { transform: 'translateX(2%)' },
      '100%': { transform: 'translateX(0%)' },
    } as any,
    // foilShiftBg: background-position animation for gradient text on rare/epic/mythic/uncommon IDs
    ['@keyframes foilShiftBg' as any]: {
      '0%':   { backgroundPosition: '0% 50%' },
      '50%':  { backgroundPosition: '100% 50%' },
      '100%': { backgroundPosition: '0% 50%' },
    } as any,
    // shimmerSweep: full-width highlight sweep for shimmer overlay
    ['@keyframes shimmerSweep' as any]: {
      '0%':   { transform: 'translateX(-100%)' },
      '100%': { transform: 'translateX(100%)' },
    } as any,
    // borderShimmer: background-position animation for the rare left-border-stripe treatment
    ['@keyframes borderShimmer' as any]: {
      '0%':   { backgroundPosition: '0% 0%' },
      '50%':  { backgroundPosition: '0% 100%' },
      '100%': { backgroundPosition: '0% 0%' },
    } as any,
    // goldPulse: gentle opacity breath for gold rarity treatment
    ['@keyframes goldPulse' as any]: {
      '0%':   { opacity: '0.8' },
      '50%':  { opacity: '1' },
      '100%': { opacity: '0.8' },
    } as any,
    // holoPulse: gentle opacity breath for holo overlay
    ['@keyframes holoPulse' as any]: {
      '0%':   { opacity: '0.2' },
      '50%':  { opacity: '0.3' },
      '100%': { opacity: '0.2' },
    } as any,
    // spin: continuous rotation for loading indicators
    ['@keyframes spin' as any]: {
      from: { transform: 'rotate(0deg)' },
      to:   { transform: 'rotate(360deg)' },
    } as any,
    // packRevealScale: entrance scale-up for new cards (PackRevealAnimation)
    ['@keyframes packRevealScale' as any]: {
      '0%':   { transform: 'scale(0)', opacity: '0' },
      '60%':  { transform: 'scale(1.06)', opacity: '1' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    } as any,
    // packRevealShimmer: one-shot shimmer sweep for PackRevealAnimation overlay
    ['@keyframes packRevealShimmer' as any]: {
      '0%':   { transform: 'translateX(-120%)', opacity: '1' },
      '100%': { transform: 'translateX(200%)', opacity: '0' },
    } as any,
    // drawCheck: SVG stroke draw for CompletionCelebration checkmark
    ['@keyframes drawCheck' as any]: {
      '0%':   { strokeDashoffset: '60' },
      '100%': { strokeDashoffset: '0' },
    } as any,
    // burstParticle: explode outward + fade for celebration particles
    // Each particle uses a CSS custom property (--tx, --ty) for direction
    ['@keyframes burstParticle' as any]: {
      '0%':   { transform: 'translate(-50%, -50%) translate(0px, 0px)', opacity: '1' },
      '100%': { transform: 'translate(-50%, -50%) translate(var(--tx), var(--ty))', opacity: '0' },
    } as any,
    // xterm sizing — PTY terminals must fill their container
    '.xterm, .xterm-viewport, .xterm-screen': {
      height: '100% !important',
      width: '100% !important',
    },
  },
});

export const system = createSystem(defaultConfig, config);
