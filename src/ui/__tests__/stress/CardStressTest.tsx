/**
 * CardStressTest — Phase 2 performance stress test for TCG card animations.
 *
 * PURPOSE: Renders 20 animated card shells (4 per rarity tier) to validate
 * animation performance before building the full card component system.
 *
 * HOW TO RUN:
 *   This component is not imported by the production build. To view it,
 *   temporarily render it in App.tsx or mount it via a dedicated test entry.
 *   Example (in App.tsx, guarded by a dev flag):
 *     import { CardStressTest } from './__tests__/stress/CardStressTest';
 *     // Replace the Dashboard return with: <CardStressTest />
 *
 * PROFILING WITH CHROME DEVTOOLS:
 *   1. Open chrome://flags and ensure "Enable hardware compositing" is on.
 *   2. Navigate to the stress test page.
 *   3. Open DevTools → Performance tab.
 *   4. Click Record, let it run for 3-5 seconds, then click Stop.
 *   5. Inspect the "Frames" section. Each frame should be ≤ 16ms (60fps).
 *   6. Look for purple "Rendering" and green "Painting" bars in the main thread.
 *      GPU-composited animations (transform/opacity only) should show minimal
 *      main-thread activity and appear primarily in the GPU process row.
 *   7. Check the console for the rAF frame-time log printed every 60 frames.
 *
 * ANIMATION CONSTRAINTS (strictly enforced):
 *   - All keyframes use transform and opacity only — no box-shadow in any animation.
 *   - All five keyframes are already declared in src/ui/theme/index.ts globalCss.
 *   - Mythic holo overlay is ALWAYS visible at rest (opacity 0.2), not only on hover.
 *   - Rare shimmer sets --card-accent on the card element to drive the gradient token.
 */

import { useEffect, useRef } from 'react';
import { Box, Flex, Text, Grid } from '@chakra-ui/react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'mythic';

interface CardShellConfig {
  rarity: Rarity;
  accentColor: string; // used for --card-accent on Rare tier
  label: string;
  borderColor: string;
}

// ---------------------------------------------------------------------------
// Rarity configuration
// ---------------------------------------------------------------------------

const RARITY_CONFIGS: Record<Rarity, CardShellConfig> = {
  common: {
    rarity: 'common',
    accentColor: '#8B99B3',
    label: 'COMMON',
    borderColor: '#3D5070',
  },
  uncommon: {
    rarity: 'uncommon',
    accentColor: '#34D399',
    label: 'UNCOMMON',
    borderColor: '#34D399',
  },
  rare: {
    rarity: 'rare',
    accentColor: '#60A5FA',
    label: 'RARE',
    borderColor: '#60A5FA',
  },
  epic: {
    rarity: 'epic',
    accentColor: '#FFD700',
    label: 'EPIC',
    borderColor: '#B8860B',
  },
  mythic: {
    rarity: 'mythic',
    accentColor: '#ff00ff',
    label: 'MYTHIC',
    borderColor: '#8B5CF6',
  },
};

// 4 cards per rarity, 5 rarities = 20 cards total
const CARDS: Array<{ rarity: Rarity; index: number }> = (
  ['common', 'uncommon', 'rare', 'epic', 'mythic'] as Rarity[]
).flatMap((rarity) => [0, 1, 2, 3].map((index) => ({ rarity, index })));

// ---------------------------------------------------------------------------
// Frame-time performance monitor
// ---------------------------------------------------------------------------

function useFrameTimeMonitor() {
  const rafRef = useRef<number>(0);
  const frameTimes = useRef<number[]>([]);
  const lastTimestamp = useRef<number>(0);
  const frameCount = useRef<number>(0);

  useEffect(() => {
    // Skip measurement if reduced motion is preferred — rAF still runs but
    // there is nothing meaningful to measure without animations.
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      console.info(
        '[CardStressTest] prefers-reduced-motion is active — animations are suppressed. Frame-time measurement skipped.'
      );
      return;
    }

    const measure = (timestamp: number) => {
      if (lastTimestamp.current !== 0) {
        const delta = timestamp - lastTimestamp.current;
        frameTimes.current.push(delta);
        frameCount.current += 1;

        // Log a summary every 60 frames (~1 second at 60fps)
        if (frameCount.current % 60 === 0) {
          const recent = frameTimes.current.slice(-60);
          const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const worst = Math.max(...recent);
          console.log(
            `[CardStressTest] Frame times (last 60 frames): avg=${avg.toFixed(2)}ms, worst=${worst.toFixed(2)}ms`
          );
        }
      }
      lastTimestamp.current = timestamp;
      rafRef.current = requestAnimationFrame(measure);
    };

    rafRef.current = requestAnimationFrame(measure);

    return () => {
      cancelAnimationFrame(rafRef.current);
      console.info('[CardStressTest] Frame-time monitor stopped.');
    };
  }, []);
}

// ---------------------------------------------------------------------------
// Individual card shells
// ---------------------------------------------------------------------------

function CommonCard({ config }: { config: CardShellConfig }) {
  return (
    <CardShellBase config={config}>
      {/* No animation for Common */}
      <Box
        position="absolute"
        inset={0}
        borderRadius="10px"
        background="linear-gradient(135deg, #2A3750 0%, #3D5070 50%, #2A3750 100%)"
        opacity={0.15}
        pointerEvents="none"
      />
    </CardShellBase>
  );
}

function UncommonCard({ config }: { config: CardShellConfig }) {
  return (
    <CardShellBase config={config}>
      {/* foilShift: subtle background translateX oscillation */}
      <Box
        position="absolute"
        inset={0}
        borderRadius="10px"
        background="linear-gradient(135deg, #2A3750 0%, #3D5070 50%, #2A3750 100%)"
        opacity={0.25}
        pointerEvents="none"
        style={{
          animation: 'foilShift 3s ease-in-out infinite',
          willChange: 'transform',
        }}
      />
    </CardShellBase>
  );
}

function RareCard({ config }: { config: CardShellConfig }) {
  return (
    // --card-accent set on the card element so the shimmer gradient token resolves
    <CardShellBase
      config={config}
      cssVars={{ '--card-accent': config.accentColor } as React.CSSProperties}
    >
      {/* shimmerSweep: sweeping highlight overlay */}
      <Box
        position="absolute"
        inset={0}
        borderRadius="10px"
        // Uses var(--card-accent) via the rarity.shimmer.gradient token
        background="linear-gradient(90deg, transparent 0%, var(--card-accent) 50%, transparent 100%)"
        opacity={0.15}
        pointerEvents="none"
        style={{
          animation: 'shimmerSweep 2.5s linear infinite',
          willChange: 'transform',
        }}
      />
    </CardShellBase>
  );
}

function EpicCard({ config }: { config: CardShellConfig }) {
  return (
    <CardShellBase config={config}>
      {/* goldPulse: outer border wrapper pulsing via opacity */}
      <Box
        position="absolute"
        inset={0}
        borderRadius="10px"
        border="2px solid"
        borderColor="#FFD700"
        pointerEvents="none"
        style={{
          animation: 'goldPulse 4s ease-in-out infinite',
          willChange: 'opacity',
        }}
      />
      {/* Static gold gradient fill at very low opacity */}
      <Box
        position="absolute"
        inset={0}
        borderRadius="10px"
        background="linear-gradient(135deg, #B8860B 0%, #FFD700 25%, #DAA520 50%, #FFD700 75%, #B8860B 100%)"
        opacity={0.08}
        pointerEvents="none"
      />
    </CardShellBase>
  );
}

function MythicCard({ config }: { config: CardShellConfig }) {
  return (
    <CardShellBase config={config}>
      {/*
       * holoPulse: holo overlay ALWAYS VISIBLE at rest (opacity 0.2→0.3→0.2).
       * Not hover-gated — the keyframe itself drives the visibility window.
       */}
      <Box
        position="absolute"
        inset={0}
        borderRadius="10px"
        background="linear-gradient(135deg, #ff000040 0%, #00ff0040 25%, #0000ff40 50%, #ff00ff40 75%, #00ffff40 100%)"
        // Base opacity 0.2 — matches holoPulse keyframe floor so it's visible at rest
        opacity={0.2}
        pointerEvents="none"
        style={{
          animation: 'holoPulse 3s ease-in-out infinite',
          willChange: 'opacity',
        }}
      />
    </CardShellBase>
  );
}

// ---------------------------------------------------------------------------
// Shared card shell base
// ---------------------------------------------------------------------------

interface CardShellBaseProps {
  config: CardShellConfig;
  cssVars?: React.CSSProperties;
  children?: React.ReactNode;
}

function CardShellBase({ config, cssVars, children }: CardShellBaseProps) {
  return (
    <Box
      position="relative"
      width="280px"
      height="380px"
      borderRadius="10px"
      background="#1C2333"
      border="1px solid"
      borderColor={config.borderColor}
      overflow="hidden"
      style={cssVars}
      flexShrink={0}
    >
      {/* Overlay layers rendered by rarity-specific component */}
      {children}

      {/* Card content label — identifies rarity during testing */}
      <Flex
        position="absolute"
        inset={0}
        direction="column"
        align="center"
        justify="center"
        gap="2"
        pointerEvents="none"
      >
        <Text
          fontSize="xs"
          fontWeight={700}
          letterSpacing="0.12em"
          color={config.borderColor}
          textTransform="uppercase"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {config.label}
        </Text>
        <Box
          width="40px"
          height="2px"
          background={config.borderColor}
          opacity={0.4}
          borderRadius="full"
        />
        <Text
          fontSize="10px"
          color="#4E5C72"
          letterSpacing="0.06em"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          CARD SHELL
        </Text>
      </Flex>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Rarity row — label + 4 cards
// ---------------------------------------------------------------------------

function RarityRow({ rarity }: { rarity: Rarity }) {
  const config = RARITY_CONFIGS[rarity];

  const CardComponent = {
    common: CommonCard,
    uncommon: UncommonCard,
    rare: RareCard,
    epic: EpicCard,
    mythic: MythicCard,
  }[rarity];

  return (
    <Box>
      <Text
        fontSize="xs"
        fontWeight={600}
        letterSpacing="0.1em"
        color="#4E5C72"
        textTransform="uppercase"
        mb="3"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        {config.label} (×4)
      </Text>
      <Flex gap="4" flexWrap="nowrap">
        {[0, 1, 2, 3].map((i) => (
          <CardComponent key={i} config={config} />
        ))}
      </Flex>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main harness component
// ---------------------------------------------------------------------------

/**
 * CardStressTest
 *
 * Renders 20 animated card shells (4 per rarity tier).
 * Use this to validate that all 5 animation keyframes are GPU-composited and
 * maintain 60fps before building the full card component system.
 *
 * Not imported by the production build — safe to leave in the source tree.
 */
export function CardStressTest() {
  useFrameTimeMonitor();

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // Sanity assertion: verify all 20 cards are accounted for
  console.assert(
    CARDS.length === 20,
    `[CardStressTest] Expected 20 cards, got ${CARDS.length}`
  );

  return (
    <Box
      minHeight="100vh"
      background="#0D1117"
      p="8"
      overflowY="auto"
      overflowX="hidden"
    >
      {/* Header */}
      <Box mb="8">
        <Text
          fontSize="xl"
          fontWeight={700}
          color="#E8EDF4"
          mb="1"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          TCG Card Animation Stress Test
        </Text>
        <Text
          fontSize="sm"
          color="#8B99B3"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          20 card shells — 4 per rarity tier. Check console for frame-time logs.
          Profile with DevTools &gt; Performance panel (see component JSDoc for instructions).
        </Text>
        {reducedMotion && (
          <Box
            mt="3"
            px="4"
            py="2"
            background="#2D1A04"
            border="1px solid #F59E0B40"
            borderRadius="8px"
            display="inline-flex"
          >
            <Text
              fontSize="sm"
              color="#F59E0B"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              prefers-reduced-motion is active — CSS animations suppressed by global theme. JS tracking skipped.
            </Text>
          </Box>
        )}
      </Box>

      {/* Stats bar */}
      <Flex gap="6" mb="8" flexWrap="wrap">
        {[
          { label: 'Total cards', value: '20' },
          { label: 'Animated tiers', value: '4 / 5' },
          { label: 'Keyframes', value: 'foilShift, shimmerSweep, goldPulse, holoPulse' },
          { label: 'GPU properties', value: 'transform, opacity only' },
        ].map(({ label, value }) => (
          <Box
            key={label}
            px="4"
            py="2"
            background="#1C2333"
            border="1px solid #1E2A3B"
            borderRadius="8px"
          >
            <Text
              fontSize="10px"
              color="#4E5C72"
              letterSpacing="0.08em"
              textTransform="uppercase"
              mb="1"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {label}
            </Text>
            <Text
              fontSize="sm"
              fontWeight={600}
              color="#7EB8F7"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {value}
            </Text>
          </Box>
        ))}
      </Flex>

      {/* Card rows — one row per rarity */}
      <Grid gap="10">
        {(['common', 'uncommon', 'rare', 'epic', 'mythic'] as Rarity[]).map(
          (rarity) => (
            <RarityRow key={rarity} rarity={rarity} />
          )
        )}
      </Grid>
    </Box>
  );
}
